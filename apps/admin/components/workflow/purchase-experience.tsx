"use client";

import { MASTER_DATA_FIELD_OPTIONS } from "@/lib/master-data";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Row = Record<string, unknown>;
type Option = { value: string; label: string; raw: Row };
export const PURCHASE_STATES: Record<string, string> = {
  pending_approval: "待审核",
  purchasing: "采购中",
  inspected: "已质检",
  received: "已入库",
  cancelled: "已取消",
};
export const dateOnly = (value: unknown) => (typeof value === "string" ? value.slice(0, 10) : "—");
export const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export function money(value: unknown, currency: unknown = "CNY") {
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "CNY";
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: code }).format(
    Number(value ?? 0),
  );
}
export const lineAmount = (quantity: unknown, price: unknown) =>
  Math.round(Number(quantity || 0) * Number(price || 0) * 10000) / 10000;
export function purchaseSummary(row: Row) {
  const items = (row.purchaseOrderItems ?? []) as Row[];
  return {
    items,
    quantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
    sku:
      items.length > 1
        ? `${items[0]?.skuCodeSnapshot ?? ""} 等${items.length}项`
        : `${items[0]?.skuCodeSnapshot ?? "—"} ${items[0]?.skuNameSnapshot ?? ""}`,
    unitPrice: items.length === 1 ? money(items[0]?.unitPrice, row.currencyCode) : "多明细",
  };
}
export function purchaseStatus(row: Row) {
  return row.legacyReviewRequired
    ? "历史数据待复核"
    : (PURCHASE_STATES[String(row.businessStatus)] ?? "历史数据待复核");
}
export const settlementLabel = (value: unknown) =>
  MASTER_DATA_FIELD_OPTIONS.settlementMethods.find((option) => option.value === value)?.label ??
  (value == null ? "选择供应商后自动带出" : String(value));
const control = "mt-1 w-full rounded-md border bg-white p-2 text-sm text-slate-900";

export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || localToday()).slice(0, 7));
  const [year, number] = month.split("-").map(Number);
  const days = new Date(year!, number!, 0).getDate();
  const shift = (amount: number) => {
    const next = new Date(year!, number! - 1 + amount, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <div className="relative text-sm font-medium">
      <span>{label} *</span>
      <button
        type="button"
        className={control + " text-left"}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {value || "请选择日期"} <span className="float-right">▦</span>
      </button>
      {open ? (
        <div
          role="group"
          aria-label={`${label}日历`}
          className="absolute z-20 mt-1 w-72 rounded-md border bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="上个月" onClick={() => shift(-1)}>
              ‹
            </button>
            <span>{month}</span>
            <button type="button" aria-label="下个月" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <span key={day} className="text-center text-xs text-muted-foreground">
                {day}
              </span>
            ))}
            {Array.from({ length: new Date(year!, number! - 1, 1).getDay() }, (_, index) => (
              <span key={`blank${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={date}
                  aria-pressed={value === date}
                  className={`rounded p-1 hover:bg-blue-100 ${value === date ? "bg-blue-600 text-white" : ""}`}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PurchaseForm({
  suppliers,
  skus,
  saving,
  onSave,
  onCancel,
  error,
}: {
  suppliers: readonly Option[];
  skus: readonly Option[];
  saving: boolean;
  onSave: (payload: Row) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}) {
  const [supplierId, setSupplier] = useState("");
  const [documentDate, setDate] = useState(localToday());
  const [expectedDeliveryDate, setDelivery] = useState("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState([{ key: 0, skuId: "", quantity: "", unitPrice: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const supplier = suppliers.find((item) => item.value === supplierId)?.raw;
  const total = lines.reduce((sum, line) => sum + lineAmount(line.quantity, line.unitPrice), 0);
  const update = (key: number, field: string, value: string) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    );
  return (
    <form
      className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 text-slate-900 shadow-xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (!expectedDeliveryDate) return;
        void onSave({
          documentDate,
          expectedDeliveryDate,
          supplierId,
          remark,
          items: lines.map((line) => ({
            skuId: line.skuId,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            taxRate: 0,
            expectedDeliveryDate,
          })),
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">新增采购订单</h2>
        <Button type="button" variant="ghost" aria-label="关闭" onClick={onCancel}>
          ×
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-danger">
          {error}
        </p>
      ) : null}
      <div className="my-5 grid gap-4 md:grid-cols-2">
        <DatePicker label="采购日期" value={documentDate} onChange={setDate} />
        <DatePicker label="预计交付日" value={expectedDeliveryDate} onChange={setDelivery} />
        <label className="text-sm font-medium">
          供应商 *
          <select
            className={control}
            required
            value={supplierId}
            onChange={(event) => setSupplier(event.target.value)}
          >
            <option value="">请选择供应商</option>
            {suppliers.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm font-medium">
          结算方式
          <div className={control} aria-label="结算方式">
            {settlementLabel(supplier?.settlementMethod)}
          </div>
          {supplier?.paymentTerms ? (
            <p className="mt-1 text-xs text-muted-foreground">
              账期：{String(supplier.paymentTerms)}
            </p>
          ) : null}
        </div>
      </div>
      <h3 className="font-semibold">采购明细</h3>
      <div className="overflow-x-auto">
        <table className="my-3 w-full text-left text-sm">
          <thead>
            <tr>
              {["SKU / 产品信息", "数量", "单价", "金额", "操作"].map((label) => (
                <th key={label} className="p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const sku = skus.find((option) => option.value === line.skuId)?.raw;
              const product = sku?.product as Row | undefined;
              return (
                <tr key={line.key} className="border-t">
                  <td className="min-w-64 p-2">
                    <label className="sr-only" htmlFor={`purchase-sku-${line.key}`}>
                      SKU {index + 1}
                    </label>
                    <select
                      id={`purchase-sku-${line.key}`}
                      className={control}
                      value={line.skuId}
                      required
                      onChange={(event) => update(line.key, "skuId", event.target.value)}
                    >
                      <option value="">请选择SKU</option>
                      {skus.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {sku ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        型号：{String(product?.productNameEn ?? "—")} · 产品：
                        {String(product?.productName ?? sku.skuName ?? "—")} · 尺寸：
                        {String(sku.size ?? "—")} · 颜色：{String(sku.color ?? "—")}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`数量 ${index + 1}`}
                      className={control}
                      required
                      min="0.0001"
                      step="0.0001"
                      type="number"
                      value={line.quantity}
                      onChange={(event) => update(line.key, "quantity", event.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`单价 ${index + 1}`}
                      className={control}
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      value={line.unitPrice}
                      onChange={(event) => update(line.key, "unitPrice", event.target.value)}
                    />
                  </td>
                  <td className="whitespace-nowrap p-2" aria-label={`行金额 ${index + 1}`}>
                    {money(lineAmount(line.quantity, line.unitPrice), supplier?.defaultCurrency)}
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((current) => current.filter((item) => item.key !== line.key))
                      }
                    >
                      移除
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setLines((current) => [
              ...current,
              { key: nextKey, skuId: "", quantity: "", unitPrice: "" },
            ]);
            setNextKey(nextKey + 1);
          }}
        >
          添加采购明细
        </Button>
        <p className="font-semibold" aria-label="总金额">
          总金额：{money(total, supplier?.defaultCurrency)}
        </p>
      </div>
      <label className="mt-5 block text-sm font-medium">
        备注
        <textarea
          className={control}
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
        />
      </label>
      {!expectedDeliveryDate ? (
        <p className="mt-2 text-xs text-muted-foreground">请通过日历选择预计交付日。</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={saving || !expectedDeliveryDate || !supplier}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseListCells({ row }: { row: Row }) {
  const summary = purchaseSummary(row);
  return (
    <>
      {[
        dateOnly(row.documentDate),
        String(row.supplierNameSnapshot ?? "—"),
        summary.sku,
        summary.quantity,
        summary.unitPrice,
        money(row.totalAmount, row.currencyCode),
        purchaseStatus(row),
      ].map((value, index) => (
        <td
          key={index}
          className={`px-4 py-3 ${[0, 4, 5].includes(index) ? "whitespace-nowrap" : ""}`}
        >
          {value}
        </td>
      ))}
    </>
  );
}
export function PurchaseDetail({ row }: { row: Row }) {
  const summary = purchaseSummary(row);
  const text = (value: unknown) => (value == null || value === "" ? "—" : String(value));
  const fields = [
    ["采购单号", row.documentNo],
    ["采购日期", dateOnly(row.documentDate)],
    ["供应商", row.supplierNameSnapshot],
    ["结算方式", settlementLabel(row.settlementMethod)],
    ["账期", row.paymentTermsSnapshot],
    ["预计交付日", dateOnly(row.expectedDeliveryDate)],
    ["状态", purchaseStatus(row)],
    ["备注", row.remark],
  ];
  return (
    <div className="mt-5 space-y-5 text-slate-900">
      <section className="rounded-lg border bg-white p-4">
        <h3 className="font-semibold">订单信息</h3>
        {row.legacyReviewRequired ? (
          <p className="mt-3 text-amber-700">历史数据待复核；该订单仅供查看。</p>
        ) : null}
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-muted-foreground">{String(label)}</dt>
              <dd className="mt-1 text-sm">{text(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="overflow-x-auto rounded-lg border bg-white p-4">
        <h3 className="font-semibold">采购明细</h3>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr>
              {["SKU编码", "产品型号", "产品名称", "尺寸", "颜色", "数量", "单价", "金额"].map(
                (label) => (
                  <th key={label} className="whitespace-nowrap p-2">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {summary.items.map((item, index) => (
              <tr key={index} className="border-t">
                {[
                  item.skuCodeSnapshot,
                  item.productModel,
                  item.productName ?? item.skuNameSnapshot,
                  item.size,
                  item.color,
                  item.quantity,
                  money(item.unitPrice, row.currencyCode),
                  money(
                    item.lineAmount ?? lineAmount(item.quantity, item.unitPrice),
                    row.currencyCode,
                  ),
                ].map((value, cell) => (
                  <td key={cell} className="p-2">
                    {text(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 font-medium">
          SKU项数：{summary.items.length} 总数量：{summary.quantity} 总金额：
          {money(row.totalAmount, row.currencyCode)}
        </p>
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="font-semibold">流程进度</h3>
        <p className="mt-2 text-sm">
          采购质检：
          {["inspected", "received"].includes(String(row.businessStatus)) ? "已确认" : "尚未完成"}
          {" · "}采购入库：{row.businessStatus === "received" ? "已确认" : "尚未完成"}
        </p>
      </section>
      <section className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
        <h3>系统信息</h3>
        <p className="mt-2">
          创建人：{text(row.creatorName)} 审核人：{text(row.approverName)}
        </p>
        <p className="mt-2">
          创建日期：{dateOnly(row.createdAt)} 更新日期：{dateOnly(row.updatedAt)}
        </p>
      </section>
    </div>
  );
}
