"use client";

import { Archive, Boxes, Factory, PackageCheck, RefreshCw, Ship, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Skeleton, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/contexts/permission-context";
import { authenticatedFetch } from "@/lib/auth-client";

type Envelope = Readonly<{
  data?: unknown;
  error?: { message?: string };
  meta?: { total?: number };
  requestId?: string;
  success?: boolean;
}>;

type DashboardMetric = Readonly<{
  href: string;
  label: string;
  value: string;
}>;

type DashboardTask = Readonly<{
  href: string;
  label: string;
  value: string;
}>;

type DashboardState = Readonly<{
  errors: readonly string[];
  metrics: readonly DashboardMetric[];
  tasks: readonly DashboardTask[];
  updatedAt: string;
}>;

const numberFormat = new Intl.NumberFormat("zh-CN");

async function request(url: string): Promise<Envelope> {
  const response = await authenticatedFetch(url);
  const envelope = (await response.json()) as Envelope;
  if (!response.ok || envelope.success !== true) {
    const suffix = envelope.requestId ? `（Request ID：${envelope.requestId}）` : "";
    throw new Error(`${envelope.error?.message ?? "请求失败"}${suffix}`);
  }
  return envelope;
}

function total(envelope: Envelope): string {
  return numberFormat.format(envelope.meta?.total ?? 0);
}

function quantity(value: unknown): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? numberFormat.format(parsed) : "0";
}

export function Dashboard() {
  const { hasAllPermissions, hasAnyPermission, hasPermission } = usePermission();
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  const quickLinks = useMemo(
    () =>
      [
        {
          href: "/workspace/master-data/products",
          label: "新增产品",
          allowed: hasPermission("master.product.create"),
        },
        {
          href: "/workspace/purchase",
          label: "采购订单",
          allowed: hasAnyPermission(["purchase.order.read", "purchase.order.create"]),
        },
        {
          href: "/workspace/production",
          label: "生产任务",
          allowed: hasAnyPermission(["production.order.read", "production.order.create"]),
        },
        {
          href: "/workspace/inventory",
          label: "库存查询",
          allowed: hasPermission("inventory.stock.read"),
        },
        {
          href: "/workspace/cross-border",
          label: "跨境发货",
          allowed: hasPermission("cross-border.shipment.read"),
        },
      ].filter((item) => item.allowed),
    [hasAnyPermission, hasPermission],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const metrics: DashboardMetric[] = [];
    const tasks: DashboardTask[] = [];
    const errors: string[] = [];

    const loadTotal = async (label: string, href: string, url: string) => {
      try {
        metrics.push({ href, label, value: total(await request(url)) });
      } catch (error) {
        errors.push(`${label}加载失败：${error instanceof Error ? error.message : "未知错误"}`);
      }
    };

    await Promise.all([
      hasPermission("master.product.read")
        ? loadTotal(
            "产品数量",
            "/workspace/master-data/products",
            "/api/v1/products?page=1&pageSize=1",
          )
        : Promise.resolve(),
      hasPermission("master.sku.read")
        ? loadTotal("SKU 数量", "/workspace/master-data/skus", "/api/v1/skus?page=1&pageSize=1")
        : Promise.resolve(),
      hasPermission("master.warehouse.read")
        ? loadTotal(
            "仓库数量",
            "/workspace/master-data/warehouses",
            "/api/v1/warehouses?page=1&pageSize=1",
          )
        : Promise.resolve(),
      hasPermission("master.store.read")
        ? loadTotal("店铺数量", "/workspace/master-data/stores", "/api/v1/stores?page=1&pageSize=1")
        : Promise.resolve(),
    ]);

    if (hasAllPermissions(["inventory.stock.read", "master.sku.read", "master.warehouse.read"])) {
      try {
        const summary = (await request("/api/v1/inventories/summary?page=1&pageSize=100")).data as
          Record<string, unknown> | undefined;
        metrics.push(
          {
            href: "/workspace/inventory",
            label: "库存总量",
            value: quantity(summary?.onHandQuantity),
          },
          {
            href: "/workspace/inventory",
            label: "可用库存",
            value: quantity(summary?.availableQuantity),
          },
        );
      } catch (error) {
        errors.push(`库存概览加载失败：${error instanceof Error ? error.message : "未知错误"}`);
      }
    }

    const loadTask = async (label: string, href: string, url: string) => {
      try {
        tasks.push({ href, label, value: total(await request(url)) });
      } catch (error) {
        errors.push(`${label}加载失败：${error instanceof Error ? error.message : "未知错误"}`);
      }
    };

    await Promise.all([
      hasPermission("purchase.order.read")
        ? loadTask(
            "待审核采购订单",
            "/workspace/purchase",
            "/api/v1/purchase-orders?page=1&pageSize=1&status=pending_approval",
          )
        : Promise.resolve(),
      hasPermission("production.order.read")
        ? loadTask(
            "待处理生产任务",
            "/workspace/production",
            "/api/v1/production-orders?page=1&pageSize=1&status=pending_approval",
          )
        : Promise.resolve(),
      hasPermission("inbound.order.read")
        ? loadTask(
            "待入库单据",
            "/workspace/warehouse-operations",
            "/api/v1/inbound-orders?page=1&pageSize=1&status=pending_approval",
          )
        : Promise.resolve(),
      hasPermission("outbound.order.read")
        ? loadTask(
            "待出库单据",
            "/workspace/warehouse-operations",
            "/api/v1/outbound-orders?page=1&pageSize=1&status=pending_approval",
          )
        : Promise.resolve(),
    ]);

    setState({
      errors,
      metrics,
      tasks,
      updatedAt: new Date().toLocaleString("zh-CN"),
    });
    setLoading(false);
  }, [hasAllPermissions, hasPermission]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => void load(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">业务工作台</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              展示当前账号有权限访问的业务概览、待处理事项与快捷入口。
            </p>
          </div>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
        </div>
        <p className="mt-3 text-xs text-[#6B7280]">
          最近更新时间：{state?.updatedAt ?? "正在加载"}
        </p>
      </Card>

      {state?.errors.length ? (
        <Card className="border-[#F59E0B]/40 bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
          {state.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </Card>
      ) : null}

      <section className="grid grid-cols-4 gap-4" aria-label="业务概览">
        {loading
          ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)
          : state?.metrics.map((metric) => (
              <Link key={metric.label} href={metric.href}>
                <Card className="p-5 transition-colors hover:border-[#2563EB]/40">
                  <p className="text-sm text-[#6B7280]">{metric.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-[#111827]">{metric.value}</p>
                </Card>
              </Link>
            ))}
      </section>

      <section className="grid grid-cols-[1.2fr_0.8fr] gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-5 text-[#2563EB]" />
            <h2 className="font-semibold">待我处理</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </>
            ) : state?.tasks.length ? (
              state.tasks.map((task) => (
                <Link
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-[#F9FAFB]"
                  href={task.href}
                  key={task.label}
                >
                  <span>{task.label}</span>
                  <StatusBadge tone={task.value === "0" ? "neutral" : "warning"}>
                    {task.value}
                  </StatusBadge>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-[#6B7280]">
                当前没有可展示的待办事项，或当前账号暂无相关权限。
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Archive className="size-5 text-[#2563EB]" />
            <h2 className="font-semibold">常用入口</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {quickLinks.length ? (
              quickLinks.map((item) => (
                <Link
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-[#F9FAFB]"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-[#6B7280]">
                当前账号暂无快捷入口权限。
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-4 gap-4" aria-label="业务模块">
        {[
          { href: "/workspace/purchase", icon: ShoppingCart, label: "采购管理" },
          { href: "/workspace/production", icon: Factory, label: "生产管理" },
          { href: "/workspace/inventory", icon: Boxes, label: "库存管理" },
          { href: "/workspace/cross-border", icon: Ship, label: "跨境业务" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="flex items-center gap-3 p-4 hover:border-[#2563EB]/40">
                <Icon className="size-5 text-[#2563EB]" />
                <span className="text-sm font-medium">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
