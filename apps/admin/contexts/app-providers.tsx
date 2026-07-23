"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AppConfigProvider } from "./app-config-context";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppConfigProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </AppConfigProvider>
    </ThemeProvider>
  );
}
