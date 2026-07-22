"use client";

import { createContext, type ReactNode, useContext } from "react";

export type Theme = "light";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value="light">{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  return { theme: context } as const;
}
