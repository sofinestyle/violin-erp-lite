import type { PermissionCode } from "@violin-erp/api";
import { Button, Input, Text, View } from "@tarojs/components";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  bindMiniAppAuthentication,
  logoutMiniApp,
  MiniAppApiError,
  restoreMiniAppAuthentication,
  type MiniAppAuthentication,
} from "../lib/auth-client";
import { GlobalLoading } from "../components/global-loading";

export type MiniAppUser = MiniAppAuthentication["user"];

type MiniAppContextValue = Readonly<{
  hasPermission: (permission: PermissionCode) => boolean;
  healthEndpoint: null;
  locale: "zh-CN";
  logout: () => Promise<void>;
  permissions: ReadonlySet<PermissionCode>;
  theme: "light";
  user: MiniAppUser;
}>;

const MiniAppContext = createContext<MiniAppContextValue | null>(null);

function BindingPage({
  error,
  onBind,
}: {
  error: string;
  onBind: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function bind() {
    setSubmitting(true);
    try {
      await onBind(username, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="global-state">
      <Text className="global-state__title">绑定已有系统账号</Text>
      <Text className="global-state__text">首次使用需验证公司内部账号，微信不会创建新用户。</Text>
      <View>
        <Input
          className="mini-auth__input"
          onInput={(event) => setUsername(event.detail.value)}
          placeholder="用户名"
          value={username}
        />
        <Input
          className="mini-auth__input"
          onInput={(event) => setPassword(event.detail.value)}
          password
          placeholder="密码"
          value={password}
        />
        {error ? <Text className="mini-search__error">{error}</Text> : null}
        <Button className="global-state__button" disabled={submitting} onClick={() => void bind()}>
          {submitting ? "绑定中…" : "绑定并登录"}
        </Button>
      </View>
    </View>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const [authentication, setAuthentication] = useState<MiniAppAuthentication | null>(null);
  const [loading, setLoading] = useState(true);
  const [bindingRequired, setBindingRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void restoreMiniAppAuthentication()
      .then(setAuthentication)
      .catch((reason: unknown) => {
        setBindingRequired(
          reason instanceof MiniAppApiError && reason.code === "AUTH_WECHAT_NOT_BOUND",
        );
        setError(reason instanceof Error ? reason.message : "微信登录失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<MiniAppContextValue | null>(() => {
    if (!authentication) return null;
    const permissions = new Set(authentication.permissions);
    return {
      hasPermission: (permission) => permissions.has(permission),
      healthEndpoint: null,
      locale: "zh-CN",
      logout: async () => {
        await logoutMiniApp();
        setAuthentication(null);
        setBindingRequired(true);
      },
      permissions,
      theme: "light",
      user: authentication.user,
    };
  }, [authentication]);

  if (loading) return <GlobalLoading />;
  if (!value || bindingRequired) {
    return (
      <BindingPage
        error={error}
        onBind={async (username, password) => {
          setError("");
          try {
            setAuthentication(await bindMiniAppAuthentication(username, password));
            setBindingRequired(false);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "绑定失败");
          }
        }}
      />
    );
  }
  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(MiniAppContext);
  if (!context) throw new Error("useAppContext 必须在 AppProviders 内使用");
  return context;
}
