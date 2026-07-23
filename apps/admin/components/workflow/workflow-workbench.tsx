"use client";

import { Eye, Plus, RefreshCw, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Pagination,
  PermissionWrapper,
  SearchBar,
  Skeleton,
  StatusBadge,
  TableEmpty,
  toast,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth-client";
import type { WorkflowView } from "@/lib/workflow";

type Envelope = {
  data?: unknown;
  error?: { message?: string };
  meta?: { total?: number };
  requestId?: string;
  success?: boolean;
};
type Row = Record<string, unknown> & { id: string };

async function request(url: string, init: RequestInit = {}): Promise<Envelope> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await authenticatedFetch(url, { ...init, headers });
  const envelope = (await response.json()) as Envelope;
  if (!response.ok || envelope.success !== true) {
    throw new Error(
      `${envelope.error?.message ?? "请求失败"}${envelope.requestId ? `（Request ID：${envelope.requestId}）` : ""}`,
    );
  }
  return envelope;
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function WorkflowWorkbench({ view }: Readonly<{ view: WorkflowView }>) {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [timeline, setTimeline] = useState<unknown[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const url = useMemo(() => {
    if (view.apiPath.includes("{parentId}") && !keyword.trim()) return null;
    const resolvedPath = view.apiPath.replace("{parentId}", encodeURIComponent(keyword.trim()));
    const separator = resolvedPath.includes("?") ? "&" : "?";
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (keyword.trim() && !view.apiPath.includes("{parentId}"))
      query.set("keyword", keyword.trim());
    if (status) query.set("status", status);
    return `${resolvedPath}${separator}${query}`;
  }, [keyword, page, status, view.apiPath]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!url) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    try {
      const envelope = await request(url);
      setRows(Array.isArray(envelope.data) ? (envelope.data as Row[]) : []);
      setTotal(envelope.meta?.total ?? 0);
    } catch (reason) {
      setRows([]);
      setError(reason instanceof Error ? reason.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => void load(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view.createApiPath) return;
    setSaving(true);
    try {
      const value = String(new FormData(event.currentTarget).get("payload") ?? "{}");
      const payload = JSON.parse(value) as Record<string, unknown>;
      if (view.sourceType && !("sourceType" in payload) && view.id.includes("inspection")) {
        payload.sourceType = view.sourceType;
      }
      const createPath = view.createApiPath.replace(
        "{parentId}",
        encodeURIComponent(keyword.trim()),
      );
      if (
        createPath.includes("{parentId}") ||
        (view.createApiPath.includes("{parentId}") && !keyword.trim())
      ) {
        throw new Error("请先输入所属正式单据 UUID");
      }
      await request(createPath, {
        body: JSON.stringify(payload),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      toast.success(`${view.label}创建成功`);
      setFormOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row: Row) {
    setError(null);
    try {
      const detail = await request(view.detailPath.replace("{id}", encodeURIComponent(row.id)));
      const history = view.historyPath
        ? await request(view.historyPath.replace("{id}", encodeURIComponent(row.id)))
        : null;
      setSelected((detail.data as Row) ?? row);
      setTimeline(Array.isArray(history?.data) ? history.data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "详情加载失败");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            aria-label={`搜索${view.label}`}
            placeholder={view.apiPath.includes("{parentId}") ? "输入所属单据 UUID" : "搜索单号"}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="状态筛选"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="pending_approval">待审批</option>
            <option value="approved">已审批</option>
            <option value="completed">已完成</option>
          </select>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          {view.createApiPath && view.createPermission ? (
            <PermissionWrapper permission={view.createPermission}>
              <Button className="ml-auto" onClick={() => setFormOpen(true)}>
                <Plus data-icon="inline-start" />
                新增{view.label}
              </Button>
            </PermissionWrapper>
          ) : null}
        </div>
      </Card>

      {error ? (
        <Card className="border-danger/30 p-4 text-sm text-danger" role="alert">
          {error}
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5" aria-label="正在加载">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <TableEmpty />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3">单号</th>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">数量</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="px-4 py-3 font-medium">
                    {display(
                      row.documentNo ??
                        row.transactionNo ??
                        row.alertNo ??
                        row.skuCode ??
                        row.taskNo ??
                        row.paymentNo ??
                        row.completionBatchNo,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {display(
                      row.documentDate ??
                        row.transactionAt ??
                        row.generatedAt ??
                        row.updatedAt ??
                        row.paymentDate ??
                        row.completionDate,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">
                      {display(
                        row.status ??
                          row.alertStatus ??
                          row.validationStatus ??
                          row.paymentStatus ??
                          row.completionStatus,
                      )}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {display(
                      row.totalQuantity ??
                        row.onHandQuantity ??
                        row.quantity ??
                        row.totalRows ??
                        row.totalCompletedQuantity,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" onClick={() => void openDetail(row)}>
                      <Eye data-icon="inline-start" />
                      详情
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / 20))}
        onPageChange={setPage}
      />

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{view.label}详情</h2>
                <p className="text-sm text-muted-foreground">单据时间线与正式字段快照</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(null)}
                aria-label="关闭"
              >
                <X />
              </Button>
            </div>
            <Card className="mt-5 p-4">
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </Card>
            {view.historyPath ? (
              <Card className="mt-4 p-4">
                <h3 className="text-sm font-semibold">状态时间线</h3>
                {timeline.length ? (
                  <ol className="mt-3 space-y-2 border-l pl-4 text-sm">
                    {timeline.map((item, index) => (
                      <li key={index}>{JSON.stringify(item)}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">暂无状态变化记录。</p>
                )}
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="w-full max-w-2xl rounded-xl bg-background p-6 shadow-2xl"
            onSubmit={create}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">新增{view.label}</h2>
                <p className="text-sm text-muted-foreground">字段严格按 Frozen API DTO 提交。</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormOpen(false)}
                aria-label="关闭"
              >
                <X />
              </Button>
            </div>
            <label className="mt-5 block text-sm font-medium" htmlFor={`${view.id}-payload`}>
              请求 DTO（JSON）
            </label>
            <textarea
              className="mt-2 min-h-64 w-full rounded-md border bg-background p-3 font-mono text-xs"
              defaultValue={JSON.stringify(
                view.sourceType ? { sourceType: view.sourceType, items: [] } : { items: [] },
                null,
                2,
              )}
              id={`${view.id}-payload`}
              name="payload"
              required
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
