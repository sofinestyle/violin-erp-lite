import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedFetch,
  clearCredentials,
  logout,
  passwordLogin,
  restoreAuthentication,
  saveCredentials,
} from "../lib/auth-client";

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function response(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(
      status < 400
        ? { data, requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", success: true }
        : {
            error: { code: "AUTH_UNAUTHORIZED", details: [], message: "身份认证无效" },
            requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            success: false,
          },
    ),
    { headers: { "Content-Type": "application/json" }, status },
  );
}

describe("Admin authentication client", () => {
  beforeEach(() => {
    const target = new EventTarget() as EventTarget & { sessionStorage: Storage };
    target.sessionStorage = new MemoryStorage();
    vi.stubGlobal("window", target);
  });

  afterEach(() => {
    clearCredentials();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs in and restores the live session and permission summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/login")) {
          return response({ accessToken: "access-1", refreshToken: "refresh-1" });
        }
        if (url.endsWith("/session")) {
          return response({ displayName: "开发管理员", userId: "user-1", username: "dev-admin" });
        }
        return response({
          permissions: [{ permissionCode: "master.product.read" }],
        });
      }),
    );

    await passwordLogin("dev-admin", "not-logged");
    await expect(restoreAuthentication()).resolves.toEqual({
      permissions: ["master.product.read"],
      session: { displayName: "开发管理员", userId: "user-1", username: "dev-admin" },
    });
  });

  it("shares one refresh across concurrent unauthorized requests", async () => {
    saveCredentials("expired-access", "refresh-1");
    let protectedAttempts = 0;
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/refresh")) {
          refreshCalls += 1;
          await Promise.resolve();
          return response({ accessToken: "access-2", refreshToken: "refresh-2" });
        }
        protectedAttempts += 1;
        return protectedAttempts <= 2 ? response({}, 401) : response({ ok: true });
      }),
    );

    const results = await Promise.all([
      authenticatedFetch("/api/v1/products"),
      authenticatedFetch("/api/v1/suppliers"),
    ]);
    expect(results.map((item) => item.status)).toEqual([200, 200]);
    expect(refreshCalls).toBe(1);
  });

  it("clears credentials after refresh failure and performs idempotent client logout", async () => {
    saveCredentials("expired-access", "refresh-1");
    const listener = vi.fn();
    window.addEventListener("violin:authentication-lost", listener);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/refresh") ? response({}, 401) : response({}, 401),
      ),
    );

    await expect(restoreAuthentication()).resolves.toBeNull();
    expect(listener).toHaveBeenCalled();
    await expect(logout()).resolves.toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });
});
