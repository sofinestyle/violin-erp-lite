import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationIdempotencyStore,
  AuthenticationRateLimiter,
  AuthenticationService,
  hashPassword,
  HttpWechatIdentityAdapter,
  JwtService,
  loadWechatConfiguration,
  loadJwtConfiguration,
  parseLoginRequest,
  parseRefreshRequest,
  requireClientType,
  type AuthRepository,
  type AuthUserRecord,
  type WechatIdentityAdapter,
} from "../src/index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const context = {
  requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  timestamp: "2026-07-23T00:00:00.000Z",
};

function user(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    displayName: "开发管理员",
    failedLoginCount: 0,
    id: USER_ID,
    isActive: true,
    lockedUntil: null,
    mustChangePassword: false,
    passwordHash:
      "scrypt$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    permissions: [
      {
        actionCode: "read",
        moduleCode: "master",
        permissionCode: "master.product.read",
      },
    ],
    roles: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        roleCode: "administrator",
        roleName: "管理员",
      },
    ],
    status: "active",
    storeScopes: [],
    username: "dev-admin",
    warehouseScopes: [],
    wechatBound: false,
    ...overrides,
  };
}

function repository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  const current = user();
  return {
    bindWechatAndCreateSession: vi.fn().mockResolvedValue({ ...current, wechatBound: true }),
    createSession: vi.fn().mockResolvedValue(current),
    findUserByUsername: vi.fn().mockResolvedValue(current),
    findUserByWechat: vi.fn().mockResolvedValue({ ...current, wechatBound: true }),
    recordAuthenticationRejection: vi.fn(),
    recordLoginFailure: vi.fn(),
    resolveSession: vi.fn(),
    revokeFamily: vi.fn().mockResolvedValue("success"),
    rotateSession: vi.fn().mockResolvedValue({ kind: "invalid" }),
    ...overrides,
  };
}

function jwt() {
  return new JwtService(
    loadJwtConfiguration({
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_ACCESS_SECRET: "access-secret-value-with-at-least-32-characters",
      JWT_REFRESH_EXPIRES_IN: "7d",
      JWT_REFRESH_PEPPER: "refresh-pepper-value-with-at-least-32-characters",
    }),
  );
}

const wechat: WechatIdentityAdapter = {
  exchange: vi.fn().mockResolvedValue({ openid: "test-openid" }),
};

describe("Frozen authentication DTO", () => {
  it("accepts the three discriminated login modes and preserves password whitespace", () => {
    expect(
      parseLoginRequest({ loginType: "password", password: " pass ", username: " user " }),
    ).toEqual({ loginType: "password", password: " pass ", username: "user" });
    expect(
      parseLoginRequest({
        loginType: "wechat-bind",
        password: "pass",
        username: "user",
        wechatCode: " code ",
      }),
    ).toMatchObject({ loginType: "wechat-bind", wechatCode: "code" });
    expect(parseLoginRequest({ loginType: "wechat", wechatCode: "code" })).toEqual({
      loginType: "wechat",
      wechatCode: "code",
    });
  });

  it("rejects mixed, unknown and malformed fields", () => {
    expect(() =>
      parseLoginRequest({
        loginType: "password",
        password: "pass",
        username: "user",
        wechatCode: "x",
      }),
    ).toThrow("字段不能混用");
    expect(() => parseLoginRequest({ loginType: "other" })).toThrow("loginType");
    expect(() => parseLoginRequest({ loginType: "wechat", wechatCode: "x", extra: true })).toThrow(
      "未允许字段",
    );
    expect(() => parseRefreshRequest({ refreshToken: " token " })).not.toThrow();
  });

  it("requires a formal client type header", () => {
    expect(
      requireClientType(new Request("http://localhost", { headers: { "X-Client-Type": "pc" } })),
    ).toBe("pc");
    expect(() => requireClientType(new Request("http://localhost"))).toThrow("X-Client-Type");
  });
});

describe("authentication service policy", () => {
  it("creates a password session only after valid credentials", async () => {
    const createSession = vi.fn().mockImplementation(async () => user());
    const service = new AuthenticationService(
      repository({
        createSession,
        findUserByUsername: vi
          .fn()
          .mockResolvedValue(user({ passwordHash: await hashPassword(" correct password ") })),
      }),
      jwt(),
      wechat,
      "test-app",
    );

    const response = await service.login(
      {
        loginType: "password",
        password: " correct password ",
        username: "dev-admin",
      },
      "pc",
      context,
    );
    expect(response).toMatchObject({
      session: { userId: USER_ID },
      tokenType: "Bearer",
    });
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("uses the same safe error for an unknown user and an invalid password", async () => {
    const unknownService = new AuthenticationService(
      repository({ findUserByUsername: vi.fn().mockResolvedValue(null) }),
      jwt(),
      wechat,
      "test-app",
    );
    await expect(
      unknownService.login(
        { loginType: "password", password: "wrong", username: "unknown" },
        "pc",
        context,
      ),
    ).rejects.toMatchObject({ code: "AUTH_CREDENTIAL_INVALID" });

    const recordLoginFailure = vi.fn();
    const knownService = new AuthenticationService(
      repository({
        findUserByUsername: vi
          .fn()
          .mockResolvedValue(user({ passwordHash: await hashPassword("correct") })),
        recordLoginFailure,
      }),
      jwt(),
      wechat,
      "test-app",
    );
    await expect(
      knownService.login(
        { loginType: "password", password: "wrong", username: "dev-admin" },
        "pc",
        context,
      ),
    ).rejects.toMatchObject({ code: "AUTH_CREDENTIAL_INVALID" });
    expect(recordLoginFailure).toHaveBeenCalledOnce();
  });

  it("rejects disabled, locked and password-change binding users", async () => {
    for (const [record, code] of [
      [user({ isActive: false }), "AUTH_USER_DISABLED"],
      [user({ lockedUntil: new Date(Date.now() + 60_000) }), "AUTH_USER_LOCKED"],
    ] as const) {
      const service = new AuthenticationService(
        repository({ findUserByWechat: vi.fn().mockResolvedValue(record) }),
        jwt(),
        wechat,
        "test-app",
      );
      await expect(
        service.login({ loginType: "wechat", wechatCode: "code" }, "wechat-mini-program", context),
      ).rejects.toMatchObject({ code });
    }

    const service = new AuthenticationService(
      repository({
        findUserByUsername: vi.fn().mockResolvedValue(
          user({
            mustChangePassword: true,
            passwordHash: await hashPassword("correct-password"),
          }),
        ),
      }),
      jwt(),
      wechat,
      "test-app",
    );
    await expect(
      service.login(
        {
          loginType: "wechat-bind",
          password: "correct-password",
          username: "dev-admin",
          wechatCode: "code",
        },
        "wechat-mini-program",
        context,
      ),
    ).rejects.toMatchObject({ code: "AUTH_PASSWORD_CHANGE_REQUIRED" });
  });

  it("maps refresh replay, revoked and invalid outcomes to stable errors", async () => {
    for (const [kind, code] of [
      ["invalid", "AUTH_REFRESH_TOKEN_INVALID"],
      ["replay", "AUTH_REFRESH_TOKEN_REPLAY"],
      ["revoked", "AUTH_SESSION_REVOKED"],
    ] as const) {
      const service = new AuthenticationService(
        repository({ rotateSession: vi.fn().mockResolvedValue({ kind }) }),
        jwt(),
        wechat,
        "test-app",
      );
      await expect(service.refresh("opaque-refresh", "pc", context)).rejects.toMatchObject({
        code,
      });
    }
  });

  it("rejects an unbound WeChat identity", async () => {
    const service = new AuthenticationService(
      repository({ findUserByWechat: vi.fn().mockResolvedValue(null) }),
      jwt(),
      wechat,
      "test-app",
    );
    await expect(
      service.login({ loginType: "wechat", wechatCode: "code" }, "wechat-mini-program", context),
    ).rejects.toMatchObject({ code: "AUTH_WECHAT_NOT_BOUND" });
  });

  it("keeps logout idempotency in the repository boundary", async () => {
    const revokeFamily = vi.fn().mockResolvedValue("success");
    const service = new AuthenticationService(
      repository({ revokeFamily }),
      jwt(),
      wechat,
      "test-app",
    );
    const claims = {
      clientType: "pc" as const,
      expiresAt: 2,
      issuedAt: 1,
      sessionId: "33333333-3333-4333-8333-333333333333",
      tokenFamilyId: "44444444-4444-4444-8444-444444444444",
      tokenId: "55555555-5555-4555-8555-555555555555",
      tokenType: "access" as const,
      userId: USER_ID,
    };
    await service.logout(claims, "opaque-refresh", context);
    await service.logout(claims, "opaque-refresh", context);
    expect(revokeFamily).toHaveBeenCalledTimes(2);
  });
});

describe("authentication security controls", () => {
  it("limits each authentication risk key independently", () => {
    let now = 1_000;
    const limiter = new AuthenticationRateLimiter(2, 100, () => now);
    limiter.consume("login:user-a");
    limiter.consume("login:user-a");
    expect(() => limiter.consume("login:user-a")).toThrowError(
      expect.objectContaining({ code: "SECURITY_RATE_LIMIT_EXCEEDED" }),
    );
    expect(() => limiter.consume("login:user-b")).not.toThrow();
    now += 101;
    expect(() => limiter.consume("login:user-a")).not.toThrow();
  });

  it("returns the first idempotent result and rejects a changed request", async () => {
    const store = new AuthenticationIdempotencyStore();
    const operation = vi.fn().mockResolvedValue({ accessToken: "redacted" });
    await expect(store.execute("key", "same", operation)).resolves.toEqual({
      accessToken: "redacted",
    });
    await expect(store.execute("key", "same", operation)).resolves.toEqual({
      accessToken: "redacted",
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(() => store.execute("key", "different", operation)).toThrowError(
      expect.objectContaining({ code: "CONFLICT_IDEMPOTENCY_KEY_REUSED" }),
    );
  });
});

describe("WeChat identity adapter", () => {
  const configuration = loadWechatConfiguration({
    WECHAT_API_BASE_URL: "https://api.weixin.qq.com",
    WECHAT_MINI_PROGRAM_APP_ID: "test-app-id",
    WECHAT_MINI_PROGRAM_APP_SECRET: "test-app-secret",
  });

  it("maps the safe identity fields without exposing the upstream response", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ openid: "test-openid", session_key: "must-not-return" }), {
        status: 200,
      }),
    );
    const adapter = new HttpWechatIdentityAdapter(configuration, fetchImplementation);
    await expect(adapter.exchange("temporary-code")).resolves.toEqual({ openid: "test-openid" });
    const requestedUrl = new URL(fetchImplementation.mock.calls[0]![0] as URL);
    expect(requestedUrl.searchParams.get("appid")).toBe("test-app-id");
    expect(requestedUrl.searchParams.get("js_code")).toBe("temporary-code");
  });

  it("maps upstream rejection and timeout to stable safe errors", async () => {
    const rejected = new HttpWechatIdentityAdapter(
      configuration,
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ errcode: 40029 }), { status: 200 })),
    );
    await expect(rejected.exchange("invalid-code")).rejects.toMatchObject({
      code: "AUTH_WECHAT_CODE_INVALID",
    });

    const timedOut = new HttpWechatIdentityAdapter(
      configuration,
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
    );
    await expect(timedOut.exchange("temporary-code")).rejects.toMatchObject({
      code: "SYSTEM_SERVICE_UNAVAILABLE",
    });
  });

  it("fails safely when server-only configuration is missing", () => {
    expect(() => loadWechatConfiguration({})).toThrowError(
      expect.objectContaining({ code: "SYSTEM_SERVICE_UNAVAILABLE" }),
    );
  });
});
