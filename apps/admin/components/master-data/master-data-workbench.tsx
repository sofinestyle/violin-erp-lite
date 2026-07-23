"use client";

import { FileUp, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  ConfirmDialog,
  Pagination,
  PermissionWrapper,
  SearchBar,
  Skeleton,
  StatusBadge,
  TableEmpty,
  toast,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/contexts/permission-context";
import type { WorkbenchDefinition, WorkbenchField } from "@/lib/master-data";

type ApiEnvelope = Readonly<{
  data?: unknown;
  error?: { code?: string; message?: string };
  meta?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  requestId?: string;
  success?: boolean;
}>;

type RecordItem = Record<string, unknown> & {
  id: string;
  isActive?: boolean;
  updatedAt?: string;
};

function accessToken(): string | null {
  return globalThis.sessionStorage?.getItem("violin.accessToken") ?? null;
}

async function apiRequest(url: string, init: RequestInit = {}): Promise<ApiEnvelope> {
  const token = accessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const envelope = (await response.json()) as ApiEnvelope;
  if (!response.ok || envelope.success !== true) {
    const suffix = envelope.requestId ? `（Request ID：${envelope.requestId}）` : "";
    throw new Error(`${envelope.error?.message ?? "请求失败"}${suffix}`);
  }
  return envelope;
}

function fieldValue(field: WorkbenchField, value: FormDataEntryValue | null): unknown {
  if (field.type === "boolean") return value === "on";
  if (field.type === "number") return value ? Number(value) : undefined;
  if (field.key.endsWith("Assignments") && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${field.label}必须是有效 JSON`);
    }
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type MasterDataWorkbenchProps = Readonly<{
  definition: WorkbenchDefinition;
  group: "master" | "security";
}>;

export function MasterDataWorkbench({ definition, group }: MasterDataWorkbenchProps) {
  const { hasPermission } = usePermission();
  const [items, setItems] = useState<RecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [saving, setSaving] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (isActive) params.set("isActive", isActive);
    return params;
  }, [isActive, keyword, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const envelope = await apiRequest(`${definition.apiPath}?${query}`);
      setItems(Array.isArray(envelope.data) ? (envelope.data as RecordItem[]) : []);
      setTotal(envelope.meta?.total ?? 0);
    } catch (requestError) {
      setItems([]);
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [definition.apiPath, query]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => void load(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  async function openDetail(item: RecordItem) {
    setError(null);
    try {
      const envelope = await apiRequest(`${definition.apiPath}/${item.id}`);
      setSelected(envelope.data as RecordItem);
      setDrawerOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "详情加载失败");
    }
  }

  function openCreate() {
    setSelected(null);
    setDrawerOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(
        definition.fields
          .filter(
            (field) =>
              !(
                selected &&
                ["password", "roleAssignments", "roleCode", "isSystemRole"].includes(field.key)
              ),
          )
          .map((field) => [field.key, fieldValue(field, form.get(field.key))])
          .filter(([, value]) => value !== undefined),
      );
      if (selected?.updatedAt) payload.updatedAt = selected.updatedAt;
      const method = selected ? (group === "security" ? "PUT" : "PATCH") : "POST";
      const url = selected ? `${definition.apiPath}/${selected.id}` : definition.apiPath;
      await apiRequest(url, {
        body: JSON.stringify(payload),
        ...(selected ? {} : { headers: { "Idempotency-Key": crypto.randomUUID() } }),
        method,
      });
      toast.success(`${definition.label}${selected ? "更新" : "创建"}成功`);
      setDrawerOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: RecordItem) {
    if (!item.updatedAt) return;
    const enabling = item.isActive === false;
    const url =
      group === "security"
        ? `${definition.apiPath}/${item.id}/status`
        : `${definition.apiPath}/${item.id}/${enabling ? "enable" : "disable"}`;
    try {
      await apiRequest(url, {
        body: JSON.stringify({
          ...(group === "security" ? { isActive: enabling } : {}),
          ...(!enabling ? { reason: "由基础资料管理页面执行停用" } : {}),
          updatedAt: item.updatedAt,
        }),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: group === "security" ? "PATCH" : "POST",
      });
      toast.success(`${definition.label}${enabling ? "启用" : "停用"}成功`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "状态更新失败");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder={`搜索${definition.label}编码或名称`}
            aria-label={`搜索${definition.label}`}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            状态
            <select
              className="h-9 rounded-md border bg-background px-3 text-foreground"
              value={isActive}
              onChange={(event) => {
                setIsActive(event.target.value);
                setPage(1);
              }}
            >
              <option value="">全部</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toast.info("导入入口已预留；本 Task 不实现 Excel 导入逻辑。")}
            >
              <FileUp data-icon="inline-start" />
              导入
            </Button>
            <PermissionWrapper permission={definition.createPermission}>
              <Button onClick={openCreate}>
                <Plus data-icon="inline-start" />
                新增{definition.label}
              </Button>
            </PermissionWrapper>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="border-danger/30 p-4 text-sm text-danger" role="alert">
          {error}
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-3 p-5" aria-label="正在加载">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">编码</th>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {displayValue(item[definition.codeField])}
                    </td>
                    <td className="px-4 py-3">{displayValue(item[definition.nameField])}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={item.isActive === false ? "neutral" : "success"}>
                        {item.isActive === false ? "停用" : "启用"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {displayValue(item.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <PermissionWrapper permission={definition.readPermission}>
                          <Button variant="ghost" size="sm" onClick={() => void openDetail(item)}>
                            <Pencil data-icon="inline-start" />
                            {hasPermission(definition.updatePermission) ? "查看 / 编辑" : "查看"}
                          </Button>
                        </PermissionWrapper>
                        <PermissionWrapper
                          permission={
                            item.isActive === false
                              ? definition.enablePermission
                              : definition.disablePermission
                          }
                        >
                          <ConfirmDialog
                            title={`${item.isActive === false ? "启用" : "停用"}${definition.label}`}
                            description="状态变化会影响新业务选择，历史引用将继续保留。"
                            confirmLabel="确认"
                            onConfirm={() => void toggleActive(item)}
                            trigger={
                              <Button variant="secondary" size="sm">
                                {item.isActive === false ? "启用" : "停用"}
                              </Button>
                            }
                          />
                        </PermissionWrapper>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 ? <TableEmpty /> : null}
          </div>
        )}
        <div className="border-t p-4">
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      </Card>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-foreground/30" role="presentation">
          <aside
            className="ml-auto flex h-full w-[560px] flex-col bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workbench-drawer-title"
          >
            <div className="flex items-center border-b px-6 py-4">
              <div>
                <h2 id="workbench-drawer-title" className="text-lg font-semibold">
                  {selected
                    ? `${hasPermission(definition.updatePermission) ? "编辑" : "查看"}${definition.label}`
                    : `新增${definition.label}`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  字段严格映射 Frozen API 与数据库设计。
                </p>
              </div>
              <Button
                className="ml-auto"
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭抽屉"
              >
                <X />
              </Button>
            </div>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
              <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-6">
                {definition.fields
                  .filter(
                    (field) =>
                      !(
                        selected &&
                        ["password", "roleAssignments", "roleCode", "isSystemRole"].includes(
                          field.key,
                        )
                      ),
                  )
                  .map((field) => (
                    <label
                      key={field.key}
                      className={
                        field.key.endsWith("description") || field.key === "remark"
                          ? "col-span-2 flex flex-col gap-2"
                          : "flex flex-col gap-2"
                      }
                    >
                      <span className="text-sm font-medium">
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      {field.type === "boolean" ? (
                        <input
                          name={field.key}
                          type="checkbox"
                          defaultChecked={Boolean(selected?.[field.key])}
                          className="size-4"
                        />
                      ) : (
                        <input
                          name={field.key}
                          type={
                            field.type === "password"
                              ? "password"
                              : field.type === "number"
                                ? "number"
                                : "text"
                          }
                          required={field.required}
                          disabled={Boolean(
                            selected && !hasPermission(definition.updatePermission),
                          )}
                          defaultValue={displayValue(selected?.[field.key] ?? "").replace("—", "")}
                          className="h-10 rounded-md border bg-background px-3 text-sm"
                          autoComplete={field.type === "password" ? "new-password" : "off"}
                        />
                      )}
                    </label>
                  ))}
                {selected && group === "security" ? (
                  <SecurityRelationsPanel
                    definition={definition}
                    record={selected}
                    onSaved={async () => {
                      await openDetail(selected);
                      await load();
                    }}
                  />
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t p-4">
                <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                  取消
                </Button>
                <PermissionWrapper
                  permission={selected ? definition.updatePermission : definition.createPermission}
                >
                  <Button type="submit" disabled={saving}>
                    {saving ? "保存中…" : "保存"}
                  </Button>
                </PermissionWrapper>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SecurityRelationsPanel({
  definition,
  record,
  onSaved,
}: {
  definition: WorkbenchDefinition;
  record: RecordItem;
  onSaved: () => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const isRole = definition.key === "roles";
  const relations = useMemo(
    () =>
      isRole
        ? [
            { key: "permissions", label: "角色权限", readPath: "permissions" },
            { key: "warehouses", label: "仓库数据范围", readPath: "warehouses" },
            { key: "stores", label: "店铺数据范围", readPath: "stores" },
          ]
        : [{ key: "roles", label: "用户角色", readPath: "roles" }],
    [isRole],
  );

  useEffect(() => {
    let active = true;
    void Promise.all(
      relations.map(async (relation) => {
        const envelope = await apiRequest(
          `${definition.apiPath}/${record.id}/${relation.readPath}`,
        );
        return [relation.key, JSON.stringify(envelope.data, null, 2)] as const;
      }),
    )
      .then((entries) => {
        if (active) setValues(Object.fromEntries(entries));
      })
      .catch((requestError) => {
        if (active) {
          setValues({
            error: requestError instanceof Error ? requestError.message : "关联信息加载失败",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [definition.apiPath, record.id, relations]);

  async function replaceRelation(key: string) {
    if (!record.updatedAt) return;
    try {
      const parsed = JSON.parse(values[key] ?? "{}") as Record<string, unknown>;
      let payload: Record<string, unknown>;
      if (key === "permissions") {
        const rows = Array.isArray(parsed.permissions) ? parsed.permissions : [];
        payload = {
          permissionIds: rows.map((row) => {
            const value = row as Record<string, unknown>;
            const permission = value.permissions as Record<string, unknown> | undefined;
            return permission?.id ?? value.id;
          }),
          reason: "由角色权限管理页面整体替换",
          updatedAt: record.updatedAt,
        };
      } else if (key === "warehouses" || key === "stores") {
        const rows = Array.isArray(parsed[key]) ? parsed[key] : [];
        const singular = key === "warehouses" ? "warehouse" : "store";
        payload = {
          [`${singular}Assignments`]: rows.map((row) => {
            const value = row as Record<string, unknown>;
            const target = value[key] as Record<string, unknown> | undefined;
            return {
              accessLevel: value.accessLevel,
              [`${singular}Id`]: target?.id ?? value[`${singular}Id`],
            };
          }),
          reason: `由角色${key === "warehouses" ? "仓库" : "店铺"}范围页面整体替换`,
          updatedAt: record.updatedAt,
        };
      } else {
        const rows = Array.isArray(parsed.roles) ? parsed.roles : [];
        payload = {
          reason: "由用户角色管理页面整体替换",
          roleAssignments: rows.map((row) => {
            const value = row as Record<string, unknown>;
            const role = value.roles as Record<string, unknown> | undefined;
            return {
              effectiveFrom: value.effectiveFrom,
              effectiveTo: value.effectiveTo ?? null,
              roleId: role?.id ?? value.roleId,
            };
          }),
          updatedAt: record.updatedAt,
        };
      }
      await apiRequest(`${definition.apiPath}/${record.id}/${key}`, {
        body: JSON.stringify(payload),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: "PUT",
      });
      toast.success(
        `${relations.find((relation) => relation.key === key)?.label ?? "关联"}保存成功`,
      );
      await onSaved();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "保存失败");
    }
  }

  async function resetPassword() {
    if (!record.updatedAt) return;
    try {
      await apiRequest(`${definition.apiPath}/${record.id}/password`, {
        body: JSON.stringify({
          mustChangePassword,
          newPassword,
          updatedAt: record.updatedAt,
        }),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: "PATCH",
      });
      toast.success("用户密码已安全重置");
      setNewPassword("");
      await onSaved();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "密码重置失败");
    }
  }

  return (
    <section className="col-span-2 flex flex-col gap-4 border-t pt-5">
      <h3 className="font-semibold">{isRole ? "权限与数据范围" : "角色与密码"}</h3>
      {loading ? <Skeleton className="h-24" /> : null}
      {values.error ? <p className="text-sm text-danger">{values.error}</p> : null}
      {!loading
        ? relations.map((relation) => (
            <div key={relation.key} className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor={`relation-${relation.key}`}>
                {relation.label}（正式响应 JSON，可整体 Replace）
              </label>
              <textarea
                id={`relation-${relation.key}`}
                className="min-h-36 rounded-md border bg-background p-3 font-mono text-xs"
                value={values[relation.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [relation.key]: event.target.value }))
                }
              />
              <PermissionWrapper
                allOf={
                  isRole
                    ? ["security.role.assign", "security.permission.assign"]
                    : ["security.role.assign", "security.user.update"]
                }
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void replaceRelation(relation.key)}
                >
                  整体替换{relation.label}
                </Button>
              </PermissionWrapper>
            </div>
          ))
        : null}
      {!isRole ? (
        <PermissionWrapper permission="security.user.update">
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <h4 className="text-sm font-medium">重置密码</h4>
            <input
              id="security-new-password"
              type="password"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              placeholder="输入符合安全策略的新密码"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(event) => setMustChangePassword(event.target.checked)}
              />
              首次登录必须修改密码
            </label>
            <Button
              variant="secondary"
              size="sm"
              disabled={!newPassword}
              onClick={() => void resetPassword()}
            >
              确认重置密码
            </Button>
          </div>
        </PermissionWrapper>
      ) : null}
    </section>
  );
}
