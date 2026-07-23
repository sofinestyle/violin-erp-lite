import type { PermissionCode } from "@violin-erp/api";

const ACCESS_KEY = "violin.accessToken";
const REFRESH_KEY = "violin.refreshToken";

type Envelope<T> = Readonly<{
  data?: T;
  error?: { code?: string; message?: string };
  requestId?: string;
  success?: boolean;
}>;

export class MiniAppApiError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type MiniAppAuthentication = Readonly<{
  permissions: readonly PermissionCode[];
  user: Readonly<{ displayName: string; id: string; username: string }>;
}>;

function apiUrl(path: string): string {
  const baseUrl = process.env.TARO_APP_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("小程序 API 地址未配置");
  return `${baseUrl}${path}`;
}

async function runtime() {
  return (await import("@tarojs/taro")).default;
}

async function accessToken(): Promise<string> {
  return (await runtime()).getStorageSync<string>(ACCESS_KEY);
}

async function refreshToken(): Promise<string> {
  return (await runtime()).getStorageSync<string>(REFRESH_KEY);
}

async function saveTokens(access: string, refresh: string): Promise<void> {
  const taro = await runtime();
  taro.setStorageSync(ACCESS_KEY, access);
  taro.setStorageSync(REFRESH_KEY, refresh);
}

export async function clearMiniAppAuthentication(): Promise<void> {
  const taro = await runtime();
  taro.removeStorageSync(ACCESS_KEY);
  taro.removeStorageSync(REFRESH_KEY);
}

async function request<T>(
  path: string,
  method: "GET" | "POST",
  data?: unknown,
  token?: string,
  additionalHeaders: Readonly<Record<string, string>> = {},
): Promise<T> {
  const response = await (
    await runtime()
  ).request<Envelope<T>>({
    data,
    header: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Client-Type": "wechat-mini-program",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...additionalHeaders,
    },
    method,
    url: apiUrl(path),
  });
  if (response.statusCode >= 400 || response.data.success !== true || !response.data.data) {
    const suffix = response.data.requestId ? `（${response.data.requestId}）` : "";
    throw new MiniAppApiError(
      `${response.data.error?.message ?? "请求失败"}${suffix}`,
      response.statusCode,
      response.data.error?.code,
    );
  }
  return response.data.data;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await refreshToken();
    if (!current) return false;
    try {
      const tokens = await request<{ accessToken: string; refreshToken: string }>(
        "/api/v1/auth/refresh",
        "POST",
        { refreshToken: current },
      );
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      await clearMiniAppAuthentication();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function miniAppApiRequest<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
  retry = true,
): Promise<T> {
  try {
    return await request<T>(path, method, data, await accessToken());
  } catch (error) {
    if (
      retry &&
      error instanceof MiniAppApiError &&
      error.status === 401 &&
      (await refreshOnce())
    ) {
      return miniAppApiRequest<T>(path, method, data, false);
    }
    if (error instanceof MiniAppApiError && error.status === 401) {
      await clearMiniAppAuthentication();
    }
    throw error;
  }
}

async function wxCode(): Promise<string> {
  const result = await (await runtime()).login();
  if (!result.code) throw new MiniAppApiError("微信授权失败", 401, "AUTH_WECHAT_CODE_INVALID");
  return result.code;
}

async function loadAuthentication(): Promise<MiniAppAuthentication> {
  const [session, permissions] = await Promise.all([
    miniAppApiRequest<{ displayName: string; userId: string; username: string }>(
      "/api/v1/auth/session",
    ),
    miniAppApiRequest<{
      permissions: readonly { permissionCode: PermissionCode }[];
    }>("/api/v1/auth/permissions"),
  ]);
  return {
    permissions: permissions.permissions.map((item) => item.permissionCode),
    user: { displayName: session.displayName, id: session.userId, username: session.username },
  };
}

export async function restoreMiniAppAuthentication(): Promise<MiniAppAuthentication> {
  if (await accessToken()) {
    try {
      return await loadAuthentication();
    } catch {
      await clearMiniAppAuthentication();
    }
  }
  const tokens = await request<{ accessToken: string; refreshToken: string }>(
    "/api/v1/auth/login",
    "POST",
    { loginType: "wechat", wechatCode: await wxCode() },
  );
  await saveTokens(tokens.accessToken, tokens.refreshToken);
  return loadAuthentication();
}

export async function bindMiniAppAuthentication(
  username: string,
  password: string,
): Promise<MiniAppAuthentication> {
  const tokens = await request<{ accessToken: string; refreshToken: string }>(
    "/api/v1/auth/login",
    "POST",
    { loginType: "wechat-bind", password, username, wechatCode: await wxCode() },
    undefined,
    {
      "Idempotency-Key": `wechat-bind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    },
  );
  await saveTokens(tokens.accessToken, tokens.refreshToken);
  return loadAuthentication();
}

export async function logoutMiniApp(): Promise<void> {
  const current = await refreshToken();
  try {
    if (current) {
      await miniAppApiRequest("/api/v1/auth/logout", "POST", { refreshToken: current }, false);
    }
  } finally {
    await clearMiniAppAuthentication();
  }
}
