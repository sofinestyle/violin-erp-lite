import Taro from "@tarojs/taro";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { AppProviders } from "./contexts/app-context";
import { MiniAppErrorBoundary } from "./components/global-error";
import { NetworkStatusBanner } from "./components/network-status";
import "./app.scss";
import "./styles/shell.scss";

function UpdateManager() {
  useEffect(() => {
    if (process.env.TARO_ENV !== "weapp") return;

    const updateManager = Taro.getUpdateManager();
    updateManager.onUpdateReady(() => {
      void Taro.showModal({
        title: "发现新版本",
        content: "新版本已准备完成，是否立即重启应用？",
      }).then(({ confirm }) => {
        if (confirm) updateManager.applyUpdate();
      });
    });
    updateManager.onUpdateFailed(() => {
      void Taro.showToast({ title: "新版本下载失败", icon: "none" });
    });
  }, []);

  return null;
}

export default function App({ children }: PropsWithChildren) {
  return (
    <AppProviders>
      <MiniAppErrorBoundary>
        <UpdateManager />
        <NetworkStatusBanner />
        {children}
      </MiniAppErrorBoundary>
    </AppProviders>
  );
}
