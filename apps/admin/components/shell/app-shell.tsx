"use client";

import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageContainer, PageHeader } from "@/components/common";
import { useUser } from "@/contexts/user-context";
import { useOptionalAuth } from "@/contexts/auth-context";
import { usePermission } from "@/contexts/permission-context";
import { getNavigationItem, navigationItems, type NavigationSectionId } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = Readonly<{
  activeSection: NavigationSectionId;
  children?: ReactNode;
  description?: string;
  title?: string;
}>;

export function AppShell({
  activeSection,
  children,
  description = "应用壳层已就绪，当前仅提供导航与公共状态占位。",
  title,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const authentication = useOptionalAuth();
  const { hasPermission } = usePermission();
  const activeItem = getNavigationItem(activeSection);
  const canManageUsers = hasPermission("security.user.read");

  function toggleSidebar() {
    setSidebarCollapsed((current) => !current);
  }

  useEffect(() => {
    function closeUserMenu(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHelpOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeUserMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeUserMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-[#111827] text-white shadow-xl transition-[width] duration-200",
          sidebarCollapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#2563EB] text-sm font-bold">
            V
          </div>
          {!sidebarCollapsed ? (
            <div className="ml-3 min-w-0">
              <p className="truncate text-sm font-semibold">Violin ERP Lite</p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">乐器产品管理系统</p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="一级导航">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeSection;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex h-10 items-center rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-[#1D4ED8] text-white"
                    : "text-[#D1D5DB] hover:bg-[#1F2937] hover:text-white",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!sidebarCollapsed ? <span className="ml-3 truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-12 items-center justify-center border-t border-white/10 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </button>
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-[margin] duration-200",
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-white px-5 shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="切换侧边栏">
            <Menu className="size-5" />
          </Button>
          <div className="ml-3 flex items-center gap-2 text-sm text-[#6B7280]" aria-label="面包屑">
            <span>Violin ERP Lite</span>
            <ChevronRight className="size-4" />
            <span className="font-medium text-[#1F2937]">{activeItem.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="打开帮助"
                aria-expanded={helpOpen}
                onClick={() => {
                  setHelpOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
              >
                <CircleHelp className="size-5" />
              </Button>
              {helpOpen ? (
                <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border bg-white p-4 text-sm shadow-xl">
                  <h2 className="font-semibold text-[#1F2937]">帮助与操作说明</h2>
                  <p className="mt-2 leading-6 text-[#4B5563]">
                    当前页面操作遵循已批准的业务流程。请通过左侧菜单进入基础资料、采购、生产、库存、跨境或销售相关页面。
                  </p>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    size="sm"
                    onClick={() => setInfoPanelOpen(true)}
                  >
                    打开信息面板
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="打开通知"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setHelpOpen(false);
                }}
              >
                <Bell className="size-5" />
              </Button>
              {notificationsOpen ? (
                <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border bg-white p-4 text-sm shadow-xl">
                  <h2 className="font-semibold text-[#1F2937]">通知</h2>
                  <p className="mt-2 rounded-md bg-[#F9FAFB] p-3 text-[#6B7280]">暂无通知</p>
                </div>
              ) : null}
            </div>
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                className="ml-1 h-10 gap-2 border-l pl-4"
                aria-label="打开用户菜单"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((current) => !current)}
              >
                <span className="grid size-7 place-items-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <UserRound className="size-4" />
                </span>
                <span>{user?.displayName ?? "当前用户"}</span>
                <ChevronDown className="size-4" />
              </Button>
              {userMenuOpen ? (
                <div
                  className="absolute right-0 top-11 z-40 w-48 rounded-lg border bg-white p-2 text-sm shadow-xl"
                  role="menu"
                >
                  {canManageUsers ? (
                    <Link
                      className="block rounded-md px-3 py-2 text-[#1F2937] hover:bg-[#F3F4F6]"
                      href="/workspace/access-control/users"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      用户管理
                    </Link>
                  ) : null}
                  <button
                    className="block w-full rounded-md px-3 py-2 text-left text-[#DC2626] hover:bg-[#FEF2F2]"
                    type="button"
                    role="menuitem"
                    onClick={() => void authentication?.logout()}
                  >
                    退出登录
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex h-11 items-end border-b bg-white px-5">
          <div className="flex h-10 items-center gap-2 border-b-2 border-[#2563EB] px-3 text-sm font-medium text-[#1D4ED8]">
            {activeItem.label}
          </div>
        </div>

        <div className="flex flex-1">
          <PageContainer className="flex-1">
            <PageHeader title={title ?? activeItem.label} description={description} />
            {children ?? (
              <Card>
                <EmptyState />
              </Card>
            )}
          </PageContainer>

          {infoPanelOpen ? (
            <aside className="w-80 border-l bg-white p-5" aria-label="信息面板">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">信息面板</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInfoPanelOpen(false)}
                  aria-label="关闭信息面板"
                >
                  <PanelRightClose className="size-5" />
                </Button>
              </div>
              <EmptyState
                title="暂无辅助信息"
                description="信息面板默认收起，后续业务页面按需接入。"
                compact
              />
            </aside>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              className="fixed bottom-6 right-6 z-20 rounded-full shadow-lg"
              onClick={() => setInfoPanelOpen(true)}
              aria-label="打开信息面板"
            >
              <PanelRightOpen className="size-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
