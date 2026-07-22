"use client";

import { GlobalErrorState } from "@/components/shell/global-error-state";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <GlobalErrorState
          title="系统暂时不可用"
          description="系统发生内部异常，请稍后重试。"
          onRetry={reset}
        />
      </body>
    </html>
  );
}
