import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/[...segments]/route";

const username = process.env.AUTH_INTEGRATION_USERNAME;
const password = process.env.AUTH_INTEGRATION_PASSWORD;
const integration = process.env.DATABASE_URL && username && password ? describe : describe.skip;

function request(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  accessToken?: string,
  clientType: "pc" | "wechat-mini-program" = "pc",
  idempotencyKey?: string,
) {
  return new Request(`http://localhost${path}`, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Client-Type": clientType,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    method,
  });
}

integration("SEC-001 through SEC-005 HTTP integration", () => {
  let wechatServer: Server;

  beforeAll(async () => {
    wechatServer = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ openid: "api-integration-openid" }));
    });
    await new Promise<void>((resolve) => wechatServer.listen(0, "127.0.0.1", resolve));
    const address = wechatServer.address();
    if (!address || typeof address === "string") throw new Error("微信 Mock 服务启动失败");
    process.env.WECHAT_API_BASE_URL = `http://127.0.0.1:${address.port}`;
    process.env.WECHAT_MINI_PROGRAM_APP_ID = "api-integration-app";
    process.env.WECHAT_MINI_PROGRAM_APP_SECRET = "api-integration-secret";
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      wechatServer.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("executes password login, session, permission, refresh and logout contracts", async () => {
    const loginResponse = await POST(
      request("/api/v1/auth/login", "POST", {
        loginType: "password",
        password,
        username,
      }),
    );
    const login = (await loginResponse.json()) as {
      data: { accessToken: string; refreshToken: string };
      requestId: string;
      success: boolean;
    };
    expect(loginResponse.status).toBe(200);
    expect(login).toMatchObject({ success: true });
    expect(loginResponse.headers.get("X-Request-ID")).toBe(login.requestId);

    const sessionResponse = await GET(
      request("/api/v1/auth/session", "GET", undefined, login.data.accessToken),
    );
    const session = (await sessionResponse.json()) as {
      data: { active: boolean; username: string };
      success: boolean;
    };
    expect(sessionResponse.status).toBe(200);
    expect(session).toMatchObject({
      data: { active: true, username },
      success: true,
    });

    const permissionResponse = await GET(
      request("/api/v1/auth/permissions", "GET", undefined, login.data.accessToken),
    );
    const permission = (await permissionResponse.json()) as {
      data: {
        dataScopes: { type: string }[];
        permissions: unknown[];
        roles: unknown[];
        storeScopes: unknown[];
        warehouseScopes: unknown[];
      };
      success: boolean;
    };
    expect(permissionResponse.status).toBe(200);
    expect(permission.data.permissions).toHaveLength(244);
    expect(permission.data.roles).toHaveLength(1);
    expect(permission.data.storeScopes).toEqual([]);
    expect(permission.data.warehouseScopes).toEqual([]);
    expect(permission.data.dataScopes).not.toContainEqual({ type: "all" });

    const refreshResponse = await POST(
      request("/api/v1/auth/refresh", "POST", { refreshToken: login.data.refreshToken }),
    );
    const refreshed = (await refreshResponse.json()) as {
      data: { accessToken: string; refreshToken: string };
      success: boolean;
    };
    expect(refreshResponse.status).toBe(200);
    expect(refreshed.data.refreshToken).not.toBe(login.data.refreshToken);

    const logoutResponse = await POST(
      request(
        "/api/v1/auth/logout",
        "POST",
        { refreshToken: refreshed.data.refreshToken },
        refreshed.data.accessToken,
      ),
    );
    expect(logoutResponse.status).toBe(200);
    await expect(logoutResponse.json()).resolves.toMatchObject({
      data: { loggedOut: true },
      success: true,
    });

    const revokedResponse = await GET(
      request("/api/v1/auth/session", "GET", undefined, refreshed.data.accessToken),
    );
    const revoked = (await revokedResponse.json()) as {
      error: { code: string };
      requestId: string;
      success: boolean;
    };
    expect(revokedResponse.status).toBe(401);
    expect(revoked).toMatchObject({
      error: { code: "AUTH_UNAUTHORIZED" },
      success: false,
    });
    expect(revoked.requestId).toBeTruthy();
  });

  it("executes WeChat binding, idempotent retry, automatic login and live summaries", async () => {
    const bindBody = {
      loginType: "wechat-bind",
      password,
      username,
      wechatCode: "mock-bind-code",
    };
    const bindRequest = () =>
      request(
        "/api/v1/auth/login",
        "POST",
        bindBody,
        undefined,
        "wechat-mini-program",
        "api-integration-bind-key",
      );
    const firstResponse = await POST(bindRequest());
    const first = (await firstResponse.json()) as {
      data: { accessToken: string; refreshToken: string; session: { wechatBound: boolean } };
      success: boolean;
    };
    expect(firstResponse.status).toBe(200);
    expect(first).toMatchObject({ data: { session: { wechatBound: true } }, success: true });

    const repeatedResponse = await POST(bindRequest());
    const repeated = (await repeatedResponse.json()) as typeof first;
    expect(repeatedResponse.status).toBe(200);
    expect(repeated.data.refreshToken).toBe(first.data.refreshToken);

    const automaticResponse = await POST(
      request(
        "/api/v1/auth/login",
        "POST",
        { loginType: "wechat", wechatCode: "mock-auto-code" },
        undefined,
        "wechat-mini-program",
      ),
    );
    const automatic = (await automaticResponse.json()) as typeof first;
    expect(automaticResponse.status).toBe(200);

    const [sessionResponse, permissionResponse] = await Promise.all([
      GET(
        request(
          "/api/v1/auth/session",
          "GET",
          undefined,
          automatic.data.accessToken,
          "wechat-mini-program",
        ),
      ),
      GET(
        request(
          "/api/v1/auth/permissions",
          "GET",
          undefined,
          automatic.data.accessToken,
          "wechat-mini-program",
        ),
      ),
    ]);
    expect(sessionResponse.status).toBe(200);
    expect(permissionResponse.status).toBe(200);
  });
});
