"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Theme = "light";

type ThemeContextValue = Readonly<{
  theme: Theme;
  confirmLightMode: () => void;
  notice: string;
}>;

const THEME_STORAGE_KEY = "violin.theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, "light");
    document.documentElement.dataset.theme = "light";
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: "light",
        notice,
        confirmLightMode: () => {
          globalThis.localStorage?.setItem(THEME_STORAGE_KEY, "light");
          setNotice("当前版本按已批准视觉规范仅支持 Light Mode。");
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  return context;
}
