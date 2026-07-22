"use client";

import { createContext, type ReactNode, useContext } from "react";

export type ShellUser = Readonly<{
  id: string;
  displayName: string;
}>;

type UserContextValue = Readonly<{
  user: ShellUser | null;
}>;

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  user = null,
}: {
  children: ReactNode;
  user?: ShellUser | null;
}) {
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser 必须在 UserProvider 内使用");
  return context;
}
