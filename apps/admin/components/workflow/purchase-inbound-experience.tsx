"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, dateOnly, localToday } from "./purchase-experience";
type Row = Record<string, unknown>;
type Option = { value: string; label: string; raw: Row };
const control = "mt-1 w-full rounded-md border bg-white p-2 text-sm text-slate-900";
const text = (value: unknown) => (value == null || value === "" ? "—" : String(value));
export function PurchaseInboundForm({
  orders,
  warehouses,
  saving,
  error,
  onSave,
  onCancel,
  initialOrderId = "",
}: {
  orders: readonly Option[];
  warehouses: readonly Option[];
  saving: boolean;
  error: string | null;
  onSave: (payload: Row) => Promise<void>;
  onCancel: () => void;
  initialOrderId?: string | undefined;
}) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [date, setDate] = useState(localToday);
  const [warehouseId, setWarehouseId] = useState("");
  const [performed, setPerformed] = useState("");
  const [name, setName] = useState("");
  const source = orders.find((option) => option.value === orderId)?.raw;
  const lines = (source?.purchaseOrderItems ?? []) as Row[];
  return (
    <form
      className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (!source || !performed || !warehouseId || saving) return;
        void onSave({
          documentDate: date,
          purchaseOrderId: orderId,
          warehouseId,
          inspectionPerformed: performed === "yes",
          inspectorName: performed === "yes" ? name.trim() || null : null,
          items: lines.map((line) => ({
            purchaseOrderItemId: line.id,
            skuId: line.skuId,
            quantity: Number(line.quantity) - Number(line.inboundQuantity ?? 0),
          })),
        });
      }}
    >
      <h2 className="text-lg font-semibold">新增采购入库</h2>
      <p className="mt-2 text-sm text-slate-600">
        整单一次入库；确认保存后直接增加库存，无需再次审核。
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          采购订单 *
          <select
            aria-label="采购订单"
            className={control}
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          >
            <option value="">请选择采购中的订单</option>
            {orders
              .filter(
                (option) =>
                  option.raw.businessStatus === "purchasing" && !option.raw.legacyReviewRequired,
              )
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>
        <DatePicker label="入库日期" value={date} onChange={setDate} />
        <label>
          目标仓库 *
          <select
            aria-label="目标仓库"
            className={control}
            required
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">请选择目标仓库</option>
            {warehouses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          是否质检 *
          <select
            aria-label="是否质检"
            className={control}
            required
            value={performed}
            onChange={(event) => {
              setPerformed(event.target.value);
              if (event.target.value !== "yes") setName("");
            }}
          >
            <option value="">请选择</option>
            <option value="yes">是</option>
            <option value="no">否</option>
          </select>
        </label>
        {performed === "yes" ? (
          <label>
            质检人（选填）
            <input
              aria-label="质检人"
              className={control}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      {source ? (
        <p className="mt-4">
          采购单号：{text(source.documentNo)} 供应商：{text(source.supplierNameSnapshot)}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "SKU编码",
                "产品型号",
                "产品名称",
                "尺寸",
                "颜色",
                "采购数量",
                "已入库数量",
                "本次入库数量",
              ].map((label) => (
                <th key={label} className="whitespace-nowrap p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t">
                {[
                  line.skuCodeSnapshot,
                  line.productModel,
                  line.productName ?? line.skuNameSnapshot,
                  line.size,
                  line.color,
                  line.quantity,
                  line.inboundQuantity,
                  Number(line.quantity) - Number(line.inboundQuantity ?? 0),
                ].map((value, cell) => (
                  <td key={cell} className="p-2">
                    {text(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button disabled={saving || !source || !performed || !warehouseId} type="submit">
          {saving ? "保存中…" : "确认保存"}
        </Button>
      </div>
    </form>
  );
}
export const inboundHeaders = [
  "入库日期",
  "采购单号",
  "供应商",
  "SKU摘要",
  "本次入库数量",
  "是否质检",
  "质检人",
  "目标仓库",
  "状态",
];
export function inboundBusinessValues(row: Row) {
  const lines = (row.inboundOrderItems ?? []) as Row[];
  return [
    dateOnly(row.documentDate),
    row.purchaseOrderNo,
    row.supplierName,
    lines.map((line) => line.skuCodeSnapshot).join("、"),
    row.totalQuantity,
    row.inspectionPerformed == null ? "历史未记录" : row.inspectionPerformed ? "是" : "否",
    row.inspectorName,
    row.warehouseName,
    row.status === "completed" ? "已入库" : "历史记录",
  ];
}
export function PurchaseInboundListCells({ row }: { row: Row }) {
  return (
    <>
      {inboundBusinessValues(row).map((value, index) => (
        <td className="px-4 py-3" key={index}>
          {text(value)}
        </td>
      ))}
    </>
  );
}
export function PurchaseInboundDetail({ row }: { row: Row }) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-5 text-slate-900">
      <h3 className="font-semibold">采购入库信息</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {inboundBusinessValues(row).map((value, index) => (
          <div key={index}>
            <dt className="text-sm text-slate-500">{inboundHeaders[index]}</dt>
            <dd>{text(value)}</dd>
          </div>
        ))}
      </dl>
      <h3 className="font-semibold">入库明细</h3>
      {((row.inboundOrderItems ?? []) as Row[]).map((line, index) => (
        <p key={index}>
          {text(line.skuCodeSnapshot)} · {text(line.skuNameSnapshot)} 数量：{text(line.quantity)}
        </p>
      ))}
      <p>
        库存处理结果：
        {row.status === "completed"
          ? "已完成入库，库存及流水已记录"
          : "历史记录，按原始库存流水核对"}
      </p>
    </div>
  );
}
