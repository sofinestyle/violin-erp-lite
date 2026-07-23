import type { PermissionCode } from "@violin-erp/api";

const ACCESS_KEY = "violin.accessToken";
const REFRESH_KEY = "violin.refreshToken";
const AUTH_LOST_EVENT = "violin:authentication-lost";

type Envelope<T> = Readonly<{
  data: T;
  error?: { code?: string; message?: string };
  requestId?: string;
  success: boolean;
}>;

export type AdminSession = Readonly<{
  displayName: string;
  userId: string;
  username: string;
}>;

export type RestoredAuthentication = Readonly<{
  permissions: readonly PermissionCode[];
  session: AdminSession;
}>;

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function credentials() {
  return {
    accessToken: storage()?.getItem(ACCESS_KEY) ?? null,
    refreshToken: storage()?.getItem(REFRESH_KEY) ?? null,
  };
}

export function saveCredentials(accessToken: string, refreshToken: string): void {
  storage()?.setItem(ACCESS_KEY, accessToken);
  storage()?.setItem(REFRESH_KEY, refreshToken);
}

export function clearCredentials(): void {
  storage()?.removeItem(ACCESS_KEY);
  storage()?.removeItem(REFRESH_KEY);
}

function notifyAuthenticationLost(): void {
  clearCredentials();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_LOST_EVENT));
}

export function onAuthenticationLost(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_LOST_EVENT, listener);
  return () => window.removeEventListener(AUTH_LOST_EVENT, listener);
}

function headers(init: RequestInit, accessToken?: string | null): Headers {
  const result = new Headers(init.headers);
  result.set("Accept", "application/json");
  result.set("X-Client-Type", "pc");
  if (init.body) result.set("Content-Type", "application/json");
  if (accessToken) result.set("Authorization", `Bearer ${accessToken}`);
  return result;
}

async function readEnvelope<T>(response: Response): Promise<Envelope<T>> {
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || envelope.success !== true) {
    const suffix = envelope.requestId ? `（Request ID：${envelope.requestId}）` : "";
    const error = new Error(`${envelope.error?.message ?? "请求失败"}${suffix}`);
    Object.assign(error, { code: envelope.error?.code, status: response.status });
    throw error;
  }
  return envelope;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = credentials().refreshToken;
    if (!refreshToken) return false;
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        body: JSON.stringify({ refreshToken }),
        headers: headers({ body: "json" }),
        method: "POST",
      });
      const envelope = await readEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>(response);
      saveCredentials(envelope.data.accessToken, envelope.data.refreshToken);
      return true;
    } catch {
      notifyAuthenticationLost();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: headers(init, credentials().accessToken),
  });
  if (response.status === 401 && retry && (await refreshOnce())) {
    return authenticatedFetch(url, init, false);
  }
  if (response.status === 401) notifyAuthenticationLost();
  return response;
}

export async function passwordLogin(username: string, password: string): Promise<void> {
  const response = await fetch("/api/v1/auth/login", {
    body: JSON.stringify({ loginType: "password", password, username }),
    headers: headers({ body: "json" }),
    method: "POST",
  });
  const envelope = await readEnvelope<{ accessToken: string; refreshToken: string }>(response);
  saveCredentials(envelope.data.accessToken, envelope.data.refreshToken);
}

export async function restoreAuthentication(): Promise<RestoredAuthentication | null> {
  if (!credentials().accessToken && !(await refreshOnce())) return null;
  try {
    const [sessionResponse, permissionsResponse] = await Promise.all([
      authenticatedFetch("/api/v1/auth/session"),
      authenticatedFetch("/api/v1/auth/permissions"),
    ]);
    const session = await readEnvelope<{
      displayName: string;
      userId: string;
      username: string;
    }>(sessionResponse);
    const permissions = await readEnvelope<{
      permissions: readonly { permissionCode: PermissionCode }[];
    }>(permissionsResponse);
    return {
      permissions: permissions.data.permissions.map((item) => item.permissionCode),
      session: session.data,
    };
  } catch {
    notifyAuthenticationLost();
    return null;
  }
}

export async function logout(): Promise<void> {
  const { refreshToken } = credentials();
  try {
    if (refreshToken) {
      await authenticatedFetch(
        "/api/v1/auth/logout",
        { body: JSON.stringify({ refreshToken }), method: "POST" },
        false,
      );
    }
  } finally {
    notifyAuthenticationLost();
  }
}

export async function parseAuthenticatedEnvelope<T>(response: Response): Promise<T> {
  return (await readEnvelope<T>(response)).data;
}
