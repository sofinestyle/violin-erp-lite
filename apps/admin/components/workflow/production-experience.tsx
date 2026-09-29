"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, dateOnly, localToday } from "./purchase-experience";
type Row = Record<string, unknown>;
type Option = { value: string; label: string; raw: Row };
const control = "mt-1 w-full rounded-md border bg-white p-2 text-sm text-slate-900";
const text = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const states: Record<string, string> = {
  in_production: "生产中",
  partially_received: "部分入库",
  received: "已入库",
  cancelled: "已取消",
};
export const productionStatus = (row: Row) =>
  row.legacyReviewRequired
    ? "历史数据待复核"
    : (states[String(row.businessStatus)] ?? "历史数据待复核");
export function ProductionListCells({ row }: { row: Row }) {
  const lines = (row.productionOrderItems ?? []) as Row[];
  const sku =
    lines.length > 1
      ? `${text(lines[0]?.skuCodeSnapshot)} 等${lines.length}项`
      : `${text(lines[0]?.skuCodeSnapshot)} ${text(lines[0]?.skuNameSnapshot)}`;
  return (
    <>
      {[
        dateOnly(row.documentDate),
        row.manufacturerNameSnapshot,
        sku,
        row.totalQuantity,
        productionStatus(row),
      ].map((v, i) => (
        <td className="px-4 py-3" key={i}>
          {text(v)}
        </td>
      ))}
    </>
  );
}
export function ProductionForm({
  manufacturers,
  skus,
  saving,
  error,
  onSave,
  onCancel,
}: {
  manufacturers: readonly Option[];
  skus: readonly Option[];
  saving: boolean;
  error: string | null;
  onSave: (p: Row) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(localToday);
  const [due, setDue] = useState(localToday);
  const [manufacturer, setManufacturer] = useState("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState([
    { key: 0, skuId: "", plannedQuantity: "", processingUnitPrice: "" },
  ]);
  const patch = (key: number, values: Partial<(typeof lines)[number]>) =>
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...values } : row)));
  const valid =
    manufacturer &&
    lines.length &&
    lines.every(
      (l) =>
        l.skuId &&
        Number(l.plannedQuantity) > 0 &&
        l.processingUnitPrice !== "" &&
        Number(l.processingUnitPrice) >= 0,
    ) &&
    new Set(lines.map((l) => l.skuId)).size === lines.length;
  return (
    <form
      className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-6 text-slate-900"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !saving)
          void onSave({
            documentDate: date,
            expectedCompletionDate: due,
            manufacturerId: manufacturer,
            remark,
            items: lines.map(({ skuId, plannedQuantity, processingUnitPrice }) => ({
              skuId,
              plannedQuantity,
              processingUnitPrice,
            })),
          });
      }}
    >
      <h2 className="text-lg font-semibold">新增生产订单</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DatePicker label="生产日期" value={date} onChange={setDate} />
        <DatePicker label="预计完成日" value={due} onChange={setDue} />
        <label>
          生产厂家 *
          <select
            aria-label="生产厂家"
            required
            className={control}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          >
            <option value="">请选择生产厂家</option>
            {manufacturers.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          备注
          <input
            aria-label="备注"
            className={control}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </div>
      <h3 className="mt-5 font-semibold">订单明细</h3>
      {lines.map((line, index) => {
        const sku = skus.find((o) => o.value === line.skuId)?.raw;
        return (
          <div key={line.key} className="mt-3 rounded border p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <label>
                SKU *
                <select
                  aria-label={`SKU ${index + 1}`}
                  required
                  className={control}
                  value={line.skuId}
                  onChange={(e) => {
                    const o = skus.find((o) => o.value === e.target.value);
                    patch(line.key, {
                      skuId: e.target.value,
                      processingUnitPrice: String(o?.raw.defaultProductionPrice ?? ""),
                    });
                  }}
                >
                  <option value="">请选择SKU</option>
                  {skus
                    .filter(
                      (o) => o.value === line.skuId || !lines.some((l) => l.skuId === o.value),
                    )
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                数量 *
                <input
                  aria-label={`数量 ${index + 1}`}
                  className={control}
                  required
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={line.plannedQuantity}
                  onChange={(e) => patch(line.key, { plannedQuantity: e.target.value })}
                />
              </label>
              <label>
                加工单价 *
                <input
                  aria-label={`加工单价 ${index + 1}`}
                  className={control}
                  required
                  type="number"
                  min="0"
                  step="0.0001"
                  value={line.processingUnitPrice}
                  onChange={(e) => patch(line.key, { processingUnitPrice: e.target.value })}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={lines.length === 1}
                onClick={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
              >
                删除明细
              </Button>
            </div>
            {sku ? (
              <p className="mt-2 text-sm">
                产品型号：
                {text((sku.product as Row | undefined)?.productNameEn ?? sku.productModel)}{" "}
                产品名称：
                {text(
                  (sku.product as Row | undefined)?.productName ?? sku.productName ?? sku.skuName,
                )}
                尺寸：{text(sku.size)} 颜色：{text(sku.color)}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        className="mt-3"
        type="button"
        variant="secondary"
        onClick={() =>
          setLines((rows) => [
            ...rows,
            {
              key: Math.max(...rows.map((r) => r.key)) + 1,
              skuId: "",
              plannedQuantity: "",
              processingUnitPrice: "",
            },
          ])
        }
      >
        + 添加SKU
      </Button>
      <p className="mt-3">
        总生产数量：{lines.reduce((s, l) => s + Number(l.plannedQuantity || 0), 0)}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        加工单价用于 Lite版本暂估生产入库成本，不代表完整制造成本。
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          {saving ? "保存中…" : "确认保存"}
        </Button>
      </div>
    </form>
  );
}
export function ProductionDetail({ row }: { row: Row }) {
  const lines = (row.productionOrderItems ?? []) as Row[];
  const records = (row.inboundRecords ?? []) as Row[];
  return (
    <div className="space-y-4 rounded-lg bg-white p-5 text-slate-900">
      <h3 className="font-semibold">订单信息</h3>
      <p>生产单号：{text(row.documentNo)}</p>
      <p>
        生产日期：{dateOnly(row.documentDate)} 生产厂家：{text(row.manufacturerNameSnapshot)}
      </p>
      <p>
        状态：{productionStatus(row)} 备注：{text(row.remark)}
      </p>
      <h3 className="font-semibold">订单明细</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "SKU",
                "产品型号",
                "产品名称",
                "尺寸",
                "颜色",
                "订单数量",
                "累计已入库",
                "剩余数量",
              ].map((h) => (
                <th className="p-2" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                {[
                  l.skuCodeSnapshot,
                  l.productModel,
                  l.productName,
                  l.size,
                  l.color,
                  l.plannedQuantity,
                  l.inboundQuantity,
                  Number(l.plannedQuantity) - Number(l.inboundQuantity),
                ].map((v, j) => (
                  <td className="p-2" key={j}>
                    {text(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="font-semibold">入库记录</h3>
      {records.length ? (
        records.map((r, i) => (
          <div key={i} className="rounded border p-3">
            <p>
              {dateOnly(r.documentDate)} 目标仓库：{text(r.warehouseName)} 是否质检：
              {r.inspectionPerformed == null ? "历史未记录" : r.inspectionPerformed ? "是" : "否"}
              质检人：{text(r.inspectorName)}
            </p>
            {((r.inboundOrderItems ?? []) as Row[]).map((l, j) => (
              <p key={j}>
                {text(l.skuCodeSnapshot)} 本次入库数量：{text(l.quantity)}
              </p>
            ))}
          </div>
        ))
      ) : (
        <p>暂无入库记录</p>
      )}
      <div className="text-sm text-slate-500">
        <h3>系统信息</h3>
        <p>
          创建人：{text(row.createdByName)} 创建日期：{dateOnly(row.createdAt)}
        </p>
      </div>
    </div>
  );
}
