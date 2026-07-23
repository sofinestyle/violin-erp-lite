"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { PermissionProvider } from "./permission-context";
import { UserProvider } from "./user-context";
import {
  logout as logoutRequest,
  onAuthenticationLost,
  passwordLogin,
  restoreAuthentication,
  type RestoredAuthentication,
} from "@/lib/auth-client";

type AuthContextValue = Readonly<{
  authentication: RestoredAuthentication;
  logout: () => Promise<void>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      await onLogin(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F7FA] px-6">
      <form
        className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-xl"
        onSubmit={(event) => void submit(event)}
      >
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#2563EB] font-bold text-white">
            V
          </span>
          <div>
            <h1 className="text-xl font-semibold">登录 Violin ERP Lite</h1>
            <p className="mt-1 text-sm text-[#6B7280]">使用已启用的内部系统账号</p>
          </div>
        </div>
        <label className="block text-sm font-medium" htmlFor="username">
          用户名
        </label>
        <input
          className="mt-2 h-11 w-full rounded-lg border px-3"
          id="username"
          name="username"
          autoComplete="username"
          required
        />
        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          密码
        </label>
        <input
          className="mt-2 h-11 w-full rounded-lg border px-3"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error ? <p className="mt-4 text-sm text-[#DC2626]">{error}</p> : null}
        <button
          className="mt-6 h-11 w-full rounded-lg bg-[#2563EB] font-medium text-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "登录中…" : "登录"}
        </button>
      </form>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authentication, setAuthentication] = useState<RestoredAuthentication | null>(null);
  const [restoring, setRestoring] = useState(true);

  async function restore() {
    setRestoring(true);
    setAuthentication(await restoreAuthentication());
    setRestoring(false);
  }

  useEffect(() => {
    void restoreAuthentication()
      .then(setAuthentication)
      .finally(() => setRestoring(false));
    return onAuthenticationLost(() => setAuthentication(null));
  }, []);

  if (restoring) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F7FA] text-[#4B5563]">
        正在恢复会话…
      </main>
    );
  }

  if (!authentication) {
    return (
      <LoginPage
        onLogin={async (username, password) => {
          await passwordLogin(username, password);
          await restore();
        }}
      />
    );
  }

  return (
    <AuthContext.Provider
      value={{
        authentication,
        logout: async () => {
          await logoutRequest();
          setAuthentication(null);
        },
      }}
    >
      <UserProvider
        user={{
          displayName: authentication.session.displayName,
          id: authentication.session.userId,
        }}
      >
        <PermissionProvider permissions={authentication.permissions}>{children}</PermissionProvider>
      </UserProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 的认证区域内使用");
  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
