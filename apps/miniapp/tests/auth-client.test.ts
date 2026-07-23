import { beforeEach, describe, expect, it, vi } from "vitest";

const taro = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    getStorageSync: vi.fn((key: string) => values.get(key) ?? ""),
    login: vi.fn(async () => ({ code: "temporary-code" })),
    removeStorageSync: vi.fn((key: string) => values.delete(key)),
    request: vi.fn(),
    setStorageSync: vi.fn((key: string, value: string) => values.set(key, value)),
    values,
  };
});

vi.mock("@tarojs/taro", () => ({ default: taro }));

import {
  bindMiniAppAuthentication,
  logoutMiniApp,
  miniAppApiRequest,
  MiniAppApiError,
  restoreMiniAppAuthentication,
} from "../src/lib/auth-client";

function success<T>(data: T) {
  return { data: { data, requestId: "request-id", success: true }, statusCode: 200 };
}

function failure(code: string, statusCode = 401) {
  return {
    data: { error: { code, message: "认证失败" }, requestId: "request-id", success: false },
    statusCode,
  };
}

function authenticationSummary(config: { url: string }) {
  if (config.url.endsWith("/session")) {
    return success({ displayName: "开发管理员", userId: "user-1", username: "dev-admin" });
  }
  return success({ permissions: [{ permissionCode: "master.product.read" }] });
}

describe("Mini Program authentication client", () => {
  beforeEach(() => {
    process.env.TARO_APP_API_BASE_URL = "http://localhost:3000";
    taro.values.clear();
    taro.request.mockReset();
    taro.login.mockClear();
    taro.setStorageSync.mockClear();
    taro.removeStorageSync.mockClear();
  });

  it("binds an existing account with a WeChat code and an idempotency key", async () => {
    taro.request.mockImplementation(
      async (config: {
        data?: { loginType?: string };
        header: Record<string, string>;
        url: string;
      }) => {
        if (config.url.endsWith("/login")) {
          expect(config.data?.loginType).toBe("wechat-bind");
          expect(config.header["Idempotency-Key"]).toMatch(/^wechat-bind-/);
          return success({ accessToken: "access-1", refreshToken: "refresh-1" });
        }
        return authenticationSummary(config);
      },
    );

    await expect(bindMiniAppAuthentication("dev-admin", "not-logged")).resolves.toEqual({
      permissions: ["master.product.read"],
      user: { displayName: "开发管理员", id: "user-1", username: "dev-admin" },
    });
    expect(taro.login).toHaveBeenCalledOnce();
  });

  it("uses WeChat automatic login and surfaces an unbound identity safely", async () => {
    taro.request.mockResolvedValueOnce(failure("AUTH_WECHAT_NOT_BOUND"));
    await expect(restoreMiniAppAuthentication()).rejects.toMatchObject({
      code: "AUTH_WECHAT_NOT_BOUND",
      status: 401,
    } satisfies Partial<MiniAppApiError>);

    taro.request.mockReset();
    taro.request.mockImplementation(
      async (config: { data?: { loginType?: string }; url: string }) => {
        if (config.url.endsWith("/login")) {
          expect(config.data?.loginType).toBe("wechat");
          return success({ accessToken: "access-2", refreshToken: "refresh-2" });
        }
        return authenticationSummary(config);
      },
    );
    await expect(restoreMiniAppAuthentication()).resolves.toMatchObject({
      user: { id: "user-1" },
    });
  });

  it("refreshes once, retries the protected request and clears the old credentials", async () => {
    taro.values.set("violin.accessToken", "expired-access");
    taro.values.set("violin.refreshToken", "refresh-1");
    let protectedCalls = 0;
    taro.request.mockImplementation(async (config: { url: string }) => {
      if (config.url.endsWith("/refresh")) {
        return success({ accessToken: "access-2", refreshToken: "refresh-2" });
      }
      protectedCalls += 1;
      return protectedCalls === 1 ? failure("AUTH_TOKEN_EXPIRED") : success({ items: [] });
    });

    await expect(miniAppApiRequest("/api/v1/products")).resolves.toEqual({ items: [] });
    expect(taro.values.get("violin.accessToken")).toBe("access-2");
    expect(taro.values.get("violin.refreshToken")).toBe("refresh-2");
  });

  it("logs out the current token family and removes local credentials", async () => {
    taro.values.set("violin.accessToken", "access-1");
    taro.values.set("violin.refreshToken", "refresh-1");
    taro.request.mockResolvedValue(success({ loggedOut: true }));

    await expect(logoutMiniApp()).resolves.toBeUndefined();
    expect(taro.request.mock.calls[0]![0]).toMatchObject({
      data: { refreshToken: "refresh-1" },
      method: "POST",
      url: "http://localhost:3000/api/v1/auth/logout",
    });
    expect(taro.values.size).toBe(0);
  });
});
