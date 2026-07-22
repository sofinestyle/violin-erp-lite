import { Button, Text, View } from "@tarojs/components";
import { Component, type ReactNode } from "react";

type ErrorBoundaryState = { hasError: boolean };

export class MiniAppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch() {
    // 仅记录安全的工程错误标识，不输出用户或环境敏感信息。
    console.error("MINIAPP_SHELL_ERROR");
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="global-state">
        <Text className="global-state__title">应用暂时不可用</Text>
        <Text className="global-state__text">应用发生异常，请重试。</Text>
        <Button className="global-state__button" onClick={() => this.setState({ hasError: false })}>
          重试
        </Button>
      </View>
    );
  }
}
