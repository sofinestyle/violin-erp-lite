"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppConfig } from "@/contexts/app-config-context";
import { fetchHealth } from "@/lib/health";
import { GlobalErrorState } from "./global-error-state";
import { GlobalLoading } from "./global-loading";

type HealthState = "checking" | "ready" | "unavailable";

export function HealthGate({ children }: { children: ReactNode }) {
  const { healthEndpoint } = useAppConfig();
  const [state, setState] = useState<HealthState>("checking");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState("checking");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeoutId = window.setTimeout(() => controller.abort(), 5_000);

    void fetchHealth(healthEndpoint, fetch, controller.signal)
      .then(() => {
        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("unavailable");
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [attempt, healthEndpoint]);

  if (state === "checking") return <GlobalLoading />;
  if (state === "unavailable") return <GlobalErrorState onRetry={retry} />;
  return children;
}
