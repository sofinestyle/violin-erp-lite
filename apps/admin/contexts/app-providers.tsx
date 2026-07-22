"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AppConfigProvider } from "./app-config-context";
import { PermissionProvider } from "./permission-context";
import { ThemeProvider } from "./theme-context";
import { UserProvider } from "./user-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppConfigProvider>
        <UserProvider>
          <PermissionProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </PermissionProvider>
        </UserProvider>
      </AppConfigProvider>
    </ThemeProvider>
  );
}
