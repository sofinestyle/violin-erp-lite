"use client";

import { useEffect } from "react";
import { GlobalErrorState } from "@/components/shell/global-error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("应用页面发生异常", { digest: error.digest });
  }, [error]);

  return (
    <GlobalErrorState title="页面加载失败" description="页面发生异常，请重试。" onRetry={reset} />
  );
}
