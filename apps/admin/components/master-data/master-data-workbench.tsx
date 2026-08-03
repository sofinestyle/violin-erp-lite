"use client";

import { FileUp, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { authenticatedFetch } from "@/lib/auth-client";
import type { WorkbenchDefinition, WorkbenchField } from "@/lib/master-data";

type ApiEnvelope = Readonly<{
  data?: unknown;
  error?: {
    code?: string;
    details?: readonly { field?: string; line?: number; message: string }[];
    message?: string;
  };
  meta?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  requestId?: string;
  success?: boolean;
}>;

type RecordItem = Record<string, unknown> & {
  id: string;
  isActive?: boolean;
  updatedAt?: string;
};

type RelationOptions = Record<string, readonly RecordItem[]>;

type BatchSkuResult = Readonly<{
  line: number;
  message: string;
  payload?: Record<string, unknown>;
  row: string;
  status: "failed" | "success";
}>;

export function formatApiError(envelope: ApiEnvelope): string {
  const details = envelope.error?.details
    ?.map((detail) => {
      const prefix = detail.field ? `${detail.field}：` : "";
      return `${prefix}${detail.message}`;
    })
    .filter(Boolean);
  const detailMessage = details?.length ? `；${details.join("；")}` : "";
  const suffix = envelope.requestId ? `（Request ID：${envelope.requestId}）` : "";
  return `${envelope.error?.message ?? "请求失败"}${detailMessage}${suffix}`;
}

async function apiRequest(url: string, init: RequestInit = {}): Promise<ApiEnvelope> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await authenticatedFetch(url, { ...init, headers });
  const envelope = (await response.json()) as ApiEnvelope;
  if (!response.ok || envelope.success !== true) {
    throw new Error(formatApiError(envelope));
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

function fieldDefaultValue(field: WorkbenchField, selected: RecordItem | null): string {
  return displayValue(selected?.[field.key] ?? field.defaultValue ?? "").replace("—", "");
}

function fieldInitialValue(field: WorkbenchField, selected: RecordItem | null): string {
  const value = selected?.[field.key] ?? field.defaultValue ?? "";
  if (value === null || value === undefined) return "";
  return String(value);
}

function initialFormValues(
  definition: WorkbenchDefinition,
  selected: RecordItem | null,
): Record<string, string> {
  return Object.fromEntries(
    definition.fields.map((field) => [field.key, fieldInitialValue(field, selected)]),
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function optionLabel(field: WorkbenchField, option: RecordItem): string {
  const code = field.optionCodeField ? displayValue(option[field.optionCodeField]) : "";
  const name = field.optionNameField ? displayValue(option[field.optionNameField]) : "";
  return [code, name].filter((item) => item && item !== "—").join(" / ") || option.id;
}

function optionName(field: WorkbenchField, option: RecordItem | undefined): string {
  if (!option) return "";
  return field.optionNameField
    ? displayValue(option[field.optionNameField])
    : optionLabel(field, option);
}

function buildSkuName(
  form: FormData,
  relationOptions: RelationOptions,
  fields: readonly WorkbenchField[],
) {
  const productField = fields.find((field) => field.key === "productId");
  const productId = String(form.get("productId") ?? "");
  const product = productField
    ? (relationOptions.productId ?? []).find((option) => option.id === productId)
    : undefined;
  const parts = [
    optionName(productField ?? fields[0]!, product),
    String(form.get("size") ?? "").trim(),
    String(form.get("color") ?? "").trim(),
    String(form.get("specification") ?? "").trim(),
  ].filter(Boolean);
  return parts.join(" / ");
}

function buildSkuNameFromParts(
  productName: string,
  size: string | undefined,
  color: string | undefined,
  specification: string | undefined,
) {
  return [productName, size, color, specification].filter(Boolean).join(" / ");
}

function buildBatchSkuPayload({
  basePayload,
  productId,
  productName,
  row,
}: {
  basePayload: Record<string, unknown>;
  productId: string;
  productName: string;
  row: string;
}) {
  const [skuCode, size, color, specification, material] = row
    .split(",")
    .map((value) => value.trim());
  if (!skuCode) throw new Error("批量 SKU 每行必须以 SKU 编码开头");
  return {
    ...basePayload,
    color: color || basePayload.color,
    material: material || basePayload.material,
    productId,
    safetyStockQuantity: basePayload.safetyStockQuantity ?? 0,
    size: size || basePayload.size,
    skuCode,
    skuName:
      String(basePayload.skuName ?? "").trim() ||
      buildSkuNameFromParts(productName, size, color, specification),
    specification: specification || basePayload.specification,
  };
}

function derivedFieldValue(
  definition: WorkbenchDefinition,
  field: WorkbenchField,
  form: FormData,
  selected: RecordItem | null,
  relationOptions: RelationOptions,
): unknown {
  if (definition.key === "product-categories" && field.key === "categoryLevel") {
    const parentId = String(form.get("parentCategoryId") ?? "");
    if (!parentId) return 1;
    const parent = (relationOptions.parentCategoryId ?? []).find(
      (option) => option.id === parentId,
    );
    const parentLevel = Number(parent?.categoryLevel ?? parent?.category_level ?? 1);
    return Number.isFinite(parentLevel) ? parentLevel + 1 : 2;
  }
  if (definition.key === "skus" && field.key === "skuName") {
    const value = String(form.get("skuName") ?? "").trim();
    return value || buildSkuName(form, relationOptions, definition.fields) || null;
  }
  const rawValue = form.get(field.key);
  if ((rawValue === null || rawValue === "") && field.defaultValue !== undefined) {
    return fieldValue(field, field.defaultValue);
  }
  return fieldValue(field, rawValue);
}

function fieldConditionMatches(
  field: WorkbenchField,
  selected: RecordItem | null,
  formValues: Record<string, string>,
): boolean {
  if (!field.visibleWhen) return true;
  const value = formValues[field.visibleWhen.field] ?? fieldInitialValue(field, selected);
  return value === field.visibleWhen.equals;
}

function shouldRenderField(
  selected: RecordItem | null,
  field: WorkbenchField,
  formValues: Record<string, string>,
): boolean {
  if (field.hidden) return false;
  if (!fieldConditionMatches(field, selected, formValues)) return false;
  return !(
    selected && ["password", "roleAssignments", "roleCode", "isSystemRole"].includes(field.key)
  );
}

function shouldSubmitField(
  selected: RecordItem | null,
  field: WorkbenchField,
  formValues: Record<string, string>,
): boolean {
  if (!fieldConditionMatches(field, selected, formValues)) return false;
  return !(
    selected && ["password", "roleAssignments", "roleCode", "isSystemRole"].includes(field.key)
  );
}

function groupedFields(
  fields: readonly WorkbenchField[],
): readonly [string, readonly WorkbenchField[]][] {
  const entries = new Map<string, WorkbenchField[]>();
  for (const field of fields) {
    const group = field.group ?? "基础信息";
    entries.set(group, [...(entries.get(group) ?? []), field]);
  }
  return [...entries.entries()];
}

function fieldColumnClass(field: WorkbenchField): string {
  return field.inputMode === "textarea" ||
    field.key.endsWith("description") ||
    field.key === "remark" ||
    field.helpText
    ? "col-span-2 flex flex-col gap-2"
    : "flex flex-col gap-2";
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
  const [relationOptions, setRelationOptions] = useState<RelationOptions>({});
  const [relationOptionsError, setRelationOptionsError] = useState<string | null>(null);
  const [relationOptionsLoading, setRelationOptionsLoading] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchSkuResults, setBatchSkuResults] = useState<BatchSkuResult[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    initialFormValues(definition, null),
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visibleFields = useMemo(
    () => definition.fields.filter((field) => shouldRenderField(selected, field, formValues)),
    [definition.fields, formValues, selected],
  );
  const visibleFieldGroups = useMemo(() => groupedFields(visibleFields), [visibleFields]);
  const relationFields = useMemo(
    () => definition.fields.filter((field) => field.optionResource),
    [definition.fields],
  );
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

  useEffect(() => {
    if (!drawerOpen || relationFields.length === 0) {
      const timer = globalThis.setTimeout(() => {
        setRelationOptions({});
        setRelationOptionsError(null);
        setRelationOptionsLoading(false);
      }, 0);
      return () => globalThis.clearTimeout(timer);
    }
    let active = true;
    const timer = globalThis.setTimeout(() => {
      setRelationOptionsLoading(true);
      setRelationOptionsError(null);
      void Promise.all(
        relationFields.map(async (field) => {
          const envelope = await apiRequest(
            `/api/v1/${field.optionResource}/options?page=1&pageSize=100`,
          );
          return [
            field.key,
            Array.isArray(envelope.data) ? (envelope.data as RecordItem[]) : [],
          ] as const;
        }),
      )
        .then((entries) => {
          if (active) setRelationOptions(Object.fromEntries(entries));
        })
        .catch((requestError) => {
          if (active) {
            setRelationOptions({});
            setRelationOptionsError(
              requestError instanceof Error ? requestError.message : "关联选项加载失败",
            );
          }
        })
        .finally(() => {
          if (active) setRelationOptionsLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      globalThis.clearTimeout(timer);
    };
  }, [drawerOpen, relationFields]);

  async function openDetail(item: RecordItem) {
    setError(null);
    try {
      const envelope = await apiRequest(`${definition.apiPath}/${item.id}`);
      const nextSelected = envelope.data as RecordItem;
      setSelected(nextSelected);
      setFormValues(initialFormValues(definition, nextSelected));
      setBatchSkuResults([]);
      setDrawerOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "详情加载失败");
    }
  }

  function openCreate() {
    setSelected(null);
    setFormValues(initialFormValues(definition, null));
    setRelationOptionsError(null);
    setBatchSkuResults([]);
    setDrawerOpen(true);
  }

  function captureFormValues(event: ChangeEvent<HTMLFormElement>) {
    const values = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].map(([key, value]) => [key, String(value)]),
    );
    if (definition.key === "warehouses" && values.ownerType !== "manufacturer") {
      values.manufacturerId = "";
    }
    setFormValues({ ...initialFormValues(definition, selected), ...values });
  }

  async function submitBatchSkuRows(
    rows: readonly string[],
    basePayload: Record<string, unknown>,
    productId: string,
    productName: string,
  ) {
    const results: BatchSkuResult[] = [];
    for (const [index, row] of rows.entries()) {
      let batchPayload: Record<string, unknown> | undefined;
      try {
        batchPayload = buildBatchSkuPayload({
          basePayload,
          productId,
          productName,
          row,
        });
        await apiRequest("/api/v1/skus", {
          body: JSON.stringify(batchPayload),
          headers: { "Idempotency-Key": crypto.randomUUID() },
          method: "POST",
        });
        results.push({
          line: index + 1,
          message: "创建成功",
          payload: batchPayload,
          row,
          status: "success",
        });
      } catch (requestError) {
        results.push({
          line: index + 1,
          message: requestError instanceof Error ? requestError.message : "创建失败",
          ...(batchPayload ? { payload: batchPayload } : {}),
          row,
          status: "failed",
        });
      }
    }
    setBatchSkuResults(results);
    return results;
  }

  async function retryBatchSkuResult(result: BatchSkuResult) {
    if (!result.payload) {
      setError("该失败行缺少有效 SKU 编码，请修正批量输入后重新保存。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/api/v1/skus", {
        body: JSON.stringify(result.payload),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      setBatchSkuResults((current) =>
        current.map((item) =>
          item.line === result.line
            ? { ...item, message: "重试创建成功", status: "success" }
            : item,
        ),
      );
      toast.success(`第 ${result.line} 行 SKU 创建成功`);
      await load();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "重试失败";
      setBatchSkuResults((current) =>
        current.map((item) =>
          item.line === result.line ? { ...item, message, status: "failed" } : item,
        ),
      );
      setError(`第 ${result.line} 行 SKU 重试失败：${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setBatchSkuResults([]);
    try {
      const form = new FormData(event.currentTarget);
      const submittedFormValues = {
        ...initialFormValues(definition, selected),
        ...Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)])),
      };
      if (definition.key === "warehouses" && submittedFormValues.ownerType !== "manufacturer") {
        submittedFormValues.manufacturerId = "";
        form.delete("manufacturerId");
      }
      const basePayloadEntries = definition.fields
        .filter((field) => shouldSubmitField(selected, field, submittedFormValues))
        .map(
          (field) =>
            [
              field.key,
              derivedFieldValue(definition, field, form, selected, relationOptions),
            ] as const,
        )
        .filter(([, value]) => value !== undefined);
      const payload = Object.fromEntries(basePayloadEntries);
      if (selected?.updatedAt) payload.updatedAt = selected.updatedAt;
      const method = selected ? (group === "security" ? "PUT" : "PATCH") : "POST";
      const url = selected ? `${definition.apiPath}/${selected.id}` : definition.apiPath;
      const batchSkuRows = String(form.get("batchSkuRows") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!selected && definition.key === "skus" && batchSkuRows.length > 0) {
        const results = await submitBatchSkuRows(
          batchSkuRows,
          payload,
          String(payload.productId ?? ""),
          buildSkuName(form, relationOptions, definition.fields),
        );
        const failed = results.filter((result) => result.status === "failed");
        if (failed.length > 0) {
          setError(
            `SKU 批量新增完成：成功 ${results.length - failed.length} 行，失败 ${failed.length} 行。`,
          );
          toast.error("部分 SKU 创建失败，请查看逐行结果并单独重试。");
          return;
        }
        toast.success(`${results.length} 个 SKU 创建成功`);
      } else if (definition.key === "products" && batchSkuRows.length > 0) {
        const envelope = await apiRequest(url, {
          body: JSON.stringify(payload),
          ...(selected ? {} : { headers: { "Idempotency-Key": crypto.randomUUID() } }),
          method,
        });
        const savedProduct = (envelope.data ?? selected ?? {}) as RecordItem;
        const productId = String(savedProduct.id ?? selected?.id ?? "");
        const productName = String(payload.productName ?? selected?.productName ?? "");
        const results = await submitBatchSkuRows(
          batchSkuRows,
          {
            productId,
            safetyStockQuantity: 0,
            unit: payload.defaultUnit,
          },
          productId,
          productName,
        );
        const failed = results.filter((result) => result.status === "failed");
        if (failed.length > 0) {
          setError(
            `产品已保存，SKU 逐条创建完成：成功 ${results.length - failed.length} 行，失败 ${failed.length} 行。失败行可单独重试；本操作不具备整体回滚能力。`,
          );
          toast.error("产品已保存，部分 SKU 创建失败。");
          await load();
          return;
        }
        toast.success(
          `${definition.label}${selected ? "更新" : "创建"}成功，${results.length} 个 SKU 创建成功`,
        );
      } else {
        await apiRequest(url, {
          body: JSON.stringify(payload),
          ...(selected ? {} : { headers: { "Idempotency-Key": crypto.randomUUID() } }),
          method,
        });
        toast.success(`${definition.label}${selected ? "更新" : "创建"}成功`);
      }
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
      {group === "master" ? <MasterDataUxHint definition={definition} /> : null}
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
        <div
          className="fixed inset-0 z-[55] bg-[#111827]/55 backdrop-blur-[1px]"
          role="presentation"
        >
          <aside
            className="ml-auto flex h-full w-[560px] flex-col border-l border-[#E5E7EB] bg-white text-[#1F2937] shadow-2xl"
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
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={save}
              onChange={captureFormValues}
            >
              {relationOptionsError ? (
                <div className="mx-6 mt-4 rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
                  {relationOptionsError}
                </div>
              ) : null}
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {visibleFieldGroups.map(([groupName, fields]) => (
                  <section
                    className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                    key={groupName}
                  >
                    <h3 className="text-sm font-semibold text-[#111827]">{groupName}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {fields.map((field) => (
                        <MasterDataFieldControl
                          definition={definition}
                          disabled={Boolean(
                            selected && !hasPermission(definition.updatePermission),
                          )}
                          field={field}
                          formValues={formValues}
                          key={field.key}
                          relationOptions={relationOptions}
                          relationOptionsLoading={relationOptionsLoading}
                          selected={selected}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {!selected && definition.key === "skus" ? <SkuBatchInput /> : null}
                {definition.key === "products" ? <SkuBatchInput mode="product" /> : null}
                {batchSkuResults.length > 0 ? (
                  <SkuBatchResultPanel
                    results={batchSkuResults}
                    saving={saving}
                    onRetry={retryBatchSkuResult}
                  />
                ) : null}
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

function MasterDataUxHint({ definition }: { definition: WorkbenchDefinition }) {
  const hints: Record<string, { body: string; title: string }> = {
    "ecommerce-platforms": {
      body: "平台与店铺仍使用独立数据对象；本页维护平台，店铺请进入店铺管理并选择所属平台。",
      title: "平台 → 店铺",
    },
    "product-categories": {
      body: "分类名称支持提琴、吉他、尤克里里、配件等预设，也可直接输入自定义分类；保存时通过现有分类 API 创建，同名分类由唯一性校验拦截。",
      title: "分类录入更轻量",
    },
    products: {
      body: "产品与 SKU 数据仍保持分离；建议先维护产品，再进入 SKU 管理补充尺寸、颜色、规格等销售/库存最小单元。",
      title: "产品 → SKU 规格",
    },
    skus: {
      body: "SKU 名称可留空，页面会根据所属产品、尺寸、颜色和规格自动生成；批量新增支持每行录入一个 SKU 编码和规格。",
      title: "SKU 规格批量录入",
    },
    stores: {
      body: "店铺必须选择所属平台；平台店铺标识填写平台后台显示的店铺 ID 或店铺编号，没有可暂不填写。",
      title: "平台 → 店铺",
    },
  };
  const hint = hints[definition.key];
  if (!hint) return null;
  return (
    <Card className="border-primary/20 bg-primary-soft p-4">
      <h2 className="text-sm font-semibold text-[#1D4ED8]">{hint.title}</h2>
      <p className="mt-1 text-sm text-[#1E3A8A]">{hint.body}</p>
    </Card>
  );
}

function MasterDataFieldControl({
  definition,
  disabled,
  field,
  formValues,
  relationOptions,
  relationOptionsLoading,
  selected,
}: {
  definition: WorkbenchDefinition;
  disabled: boolean;
  field: WorkbenchField;
  formValues: Record<string, string>;
  relationOptions: RelationOptions;
  relationOptionsLoading: boolean;
  selected: RecordItem | null;
}) {
  const value = formValues[field.key] ?? fieldDefaultValue(field, selected);
  const datalistId = `${definition.key}-${field.key}-options`;
  const required =
    field.required &&
    !(definition.key === "skus" && !selected && ["skuCode", "skuName"].includes(field.key));
  return (
    <label className={fieldColumnClass(field)}>
      <span className="text-sm font-medium">
        {field.label}
        {required ? " *" : ""}
      </span>
      {field.type === "boolean" ? (
        <span className="flex min-h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm text-[#1F2937]">
          <input
            name={field.key}
            type="checkbox"
            defaultChecked={selected ? Boolean(selected[field.key]) : field.defaultValue === "true"}
            disabled={disabled}
            className="size-4"
          />
          {field.label}
        </span>
      ) : field.optionResource ? (
        <select
          name={field.key}
          required={required}
          disabled={Boolean(relationOptionsLoading || disabled)}
          defaultValue={value}
          className="h-10 rounded-md border bg-white px-3 text-sm text-[#1F2937]"
        >
          <option value="">
            {relationOptionsLoading ? "正在加载选项…" : `请选择${field.label}`}
          </option>
          {(relationOptions[field.key] ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {optionLabel(field, option)}
            </option>
          ))}
        </select>
      ) : field.inputMode === "select" && field.options ? (
        <select
          name={field.key}
          required={required}
          disabled={disabled}
          defaultValue={value}
          className="h-10 rounded-md border bg-white px-3 text-sm text-[#1F2937]"
        >
          <option value="">{field.placeholder ?? `请选择${field.label}`}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.inputMode === "textarea" ? (
        <textarea
          name={field.key}
          required={required}
          disabled={disabled}
          defaultValue={value}
          placeholder={field.placeholder}
          className="min-h-24 rounded-md border bg-white p-3 text-sm text-[#1F2937]"
        />
      ) : (
        <>
          <input
            name={field.key}
            type={
              field.type === "password" ? "password" : field.type === "number" ? "number" : "text"
            }
            required={required}
            disabled={disabled}
            defaultValue={value}
            placeholder={field.placeholder}
            list={field.inputMode === "datalist" ? datalistId : undefined}
            className="h-10 rounded-md border bg-white px-3 text-sm text-[#1F2937]"
            autoComplete={field.type === "password" ? "new-password" : "off"}
          />
          {field.inputMode === "datalist" && field.options ? (
            <datalist id={datalistId}>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          ) : null}
        </>
      )}
      {field.helpText ? (
        <span className="text-xs text-muted-foreground">{field.helpText}</span>
      ) : null}
    </label>
  );
}

function SkuBatchInput({ mode = "sku" }: { mode?: "product" | "sku" }) {
  return (
    <section className="rounded-xl border border-dashed border-primary/40 bg-primary-soft p-4">
      <h3 className="text-sm font-semibold text-[#1D4ED8]">SKU 批量新增</h3>
      <p className="mt-1 text-xs leading-5 text-[#1E3A8A]">
        可选。每行一个 SKU，格式：SKU编码,尺寸,颜色,规格,材质。
        {mode === "product"
          ? "保存时会先保存产品，再逐条调用现有 SKU API 创建；不具备原子批量提交或整体回滚能力。"
          : "保存时逐条调用现有 SKU API 创建；不新增批量 API，不具备原子批量提交或整体回滚能力。"}
        编码仍按 Frozen API 手填，自动编码等待 UAT-009 CR。
      </p>
      <textarea
        className="mt-3 min-h-24 w-full rounded-md border bg-white p-3 text-sm text-[#1F2937]"
        name="batchSkuRows"
        placeholder={"SKU-VLN-44-NAT,4/4,原木色,单琴,实木\nSKU-VLN-34-NAT,3/4,原木色,单琴,实木"}
      />
    </section>
  );
}

function SkuBatchResultPanel({
  onRetry,
  results,
  saving,
}: {
  onRetry: (result: BatchSkuResult) => Promise<void>;
  results: readonly BatchSkuResult[];
  saving: boolean;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#111827]">SKU 逐行创建结果</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        每一行独立调用现有 SKU API。成功行不会回滚；失败行可单独重试。
      </p>
      <div className="mt-3 space-y-2">
        {results.map((result) => (
          <div
            className="flex items-start gap-3 rounded-lg border bg-[#F9FAFB] p-3 text-sm"
            key={`${result.line}-${result.row}`}
          >
            <StatusBadge tone={result.status === "success" ? "success" : "danger"}>
              {result.status === "success" ? "成功" : "失败"}
            </StatusBadge>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#111827]">第 {result.line} 行</p>
              <p className="truncate text-muted-foreground">{result.row}</p>
              <p className={result.status === "success" ? "text-[#047857]" : "text-danger"}>
                {result.message}
              </p>
            </div>
            {result.status === "failed" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving || !result.payload}
                onClick={() => void onRetry(result)}
              >
                重试此行
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
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
