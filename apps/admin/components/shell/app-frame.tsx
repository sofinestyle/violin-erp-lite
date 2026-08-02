"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppProviders } from "@/contexts/app-providers";
import { MASTER_WORKBENCHES, SECURITY_WORKBENCHES } from "@/lib/master-data";
import { getNavigationItem, isNavigationSection, type NavigationSectionId } from "@/lib/navigation";
import { AppShell } from "./app-shell";
import { HealthGate } from "./health-gate";

const routeTitles: Partial<
  Record<NavigationSectionId, Readonly<{ description: string; title: string }>>
> = {
  "access-control": {
    description: "统一维护用户、正式角色、权限分配及仓库和店铺数据范围。",
    title: "用户权限",
  },
  "master-data": {
    description: "维护 ERP 唯一正式基础数据来源；停用保留历史引用。",
    title: "基础资料",
  },
};

function sectionFromPath(pathname: string): NavigationSectionId {
  if (pathname === "/") return "home";
  const [, root, section] = pathname.split("/");
  if (root === "workspace" && section && isNavigationSection(section)) return section;
  return "home";
}

function titleFromPath(
  pathname: string,
  activeSection: NavigationSectionId,
): Readonly<{ description?: string; title: string }> {
  const [, root, section, resource] = pathname.split("/");
  if (root === "workspace" && section === "master-data" && resource) {
    const definition = MASTER_WORKBENCHES.find((item) => item.key === resource);
    if (definition) {
      return {
        description: `${definition.label}维护复用 Frozen API 与唯一数据库事实来源。`,
        title: `${definition.label}管理`,
      };
    }
  }
  if (root === "workspace" && section === "access-control" && resource) {
    const definition = SECURITY_WORKBENCHES.find((item) => item.key === resource);
    if (definition) {
      return {
        description: `${definition.label}维护复用 Phase 7 认证、授权和审计能力。`,
        title: `${definition.label}管理`,
      };
    }
  }
  const navigationItem = getNavigationItem(activeSection);
  const configured = routeTitles[activeSection];
  if (configured?.description) {
    return {
      description: configured.description,
      title: configured.title,
    };
  }
  return {
    title: configured?.title ?? navigationItem.label,
  };
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = sectionFromPath(pathname);
  const routeTitle = titleFromPath(pathname, activeSection);

  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection={activeSection}
          title={routeTitle.title}
          {...(routeTitle.description ? { description: routeTitle.description } : {})}
        >
          {children}
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
