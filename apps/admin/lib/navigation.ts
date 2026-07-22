import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  Boxes,
  Factory,
  Home,
  PackageCheck,
  Settings,
  Ship,
  ShoppingCart,
  Users,
} from "lucide-react";

export const navigationSectionIds = [
  "home",
  "master-data",
  "purchase",
  "production",
  "inventory",
  "warehouse-operations",
  "cross-border",
  "analytics",
  "access-control",
  "settings",
] as const;

export type NavigationSectionId = (typeof navigationSectionIds)[number];

export type NavigationItem = Readonly<{
  id: NavigationSectionId;
  label: string;
  href: string;
  icon: LucideIcon;
}>;

export const navigationItems: readonly NavigationItem[] = [
  { id: "home", label: "首页", href: "/", icon: Home },
  { id: "master-data", label: "基础资料", href: "/workspace/master-data", icon: Archive },
  { id: "purchase", label: "采购管理", href: "/workspace/purchase", icon: ShoppingCart },
  { id: "production", label: "生产管理", href: "/workspace/production", icon: Factory },
  { id: "inventory", label: "库存管理", href: "/workspace/inventory", icon: Boxes },
  {
    id: "warehouse-operations",
    label: "出入库管理",
    href: "/workspace/warehouse-operations",
    icon: PackageCheck,
  },
  { id: "cross-border", label: "跨境业务", href: "/workspace/cross-border", icon: Ship },
  { id: "analytics", label: "统计分析", href: "/workspace/analytics", icon: BarChart3 },
  { id: "access-control", label: "用户权限", href: "/workspace/access-control", icon: Users },
  { id: "settings", label: "系统设置", href: "/workspace/settings", icon: Settings },
];

export function isNavigationSection(value: string): value is NavigationSectionId {
  return navigationSectionIds.includes(value as NavigationSectionId);
}

export function getNavigationItem(id: NavigationSectionId) {
  return navigationItems.find((item) => item.id === id) ?? navigationItems[0]!;
}
