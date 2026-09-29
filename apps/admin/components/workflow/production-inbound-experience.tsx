"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, dateOnly, localToday } from "./purchase-experience";
type Row = Record<string, unknown>;
type Option = { value: string; label: string; raw: Row };
const control = "mt-1 w-full rounded-md border bg-white p-2 text-sm text-slate-900";
const text = (value: unknown) => (value == null || value === "" ? "—" : String(value));
export function ProductionInboundForm({
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
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const source = orders.find((option) => option.value === orderId)?.raw;
  const lines = ((source?.productionOrderItems ?? []) as Row[]).filter(
    (line) => Number(line.plannedQuantity) > Number(line.inboundQuantity),
  );
  return (
    <form
      className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (!source || !performed || !warehouseId || saving) return;
        void onSave({
          documentDate: date,
          productionOrderId: orderId,
          warehouseId,
          inspectionPerformed: performed === "yes",
          inspectorName: performed === "yes" ? name.trim() || null : null,
          items: lines
            .filter((line) => Number(quantities[String(line.id)]) > 0)
            .map((line) => ({
              productionOrderItemId: line.id,
              skuId: line.skuId,
              quantity: quantities[String(line.id)],
            })),
        });
      }}
    >
      <h2 className="text-lg font-semibold">新增成品入库</h2>
      <p className="mt-2 text-sm text-slate-600">
        支持分批入库，未填写或为零的明细本次不入库；确认保存直接更新库存。
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          生产订单 *
          <select
            aria-label="生产订单"
            className={control}
            required
            value={orderId}
            onChange={(event) => {
              setOrderId(event.target.value);
              setQuantities({});
            }}
          >
            <option value="">请选择生产中或部分入库订单</option>
            {orders
              .filter(
                (option) =>
                  ["in_production", "partially_received"].includes(
                    String(option.raw.businessStatus),
                  ) && !option.raw.legacyReviewRequired,
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
          生产单号：{text(source.documentNo)} 生产厂家：{text(source.manufacturerNameSnapshot)}
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
                "生产数量",
                "已入库数量",
                "剩余可入库",
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
                  line.plannedQuantity,
                  line.inboundQuantity,
                  Number(line.plannedQuantity) - Number(line.inboundQuantity ?? 0),
                ].map((value, cell) => (
                  <td key={cell} className="p-2">
                    {text(value)}
                  </td>
                ))}
                <td className="p-2">
                  <input
                    aria-label={`本次入库数量 ${line.skuCodeSnapshot}`}
                    className={control}
                    type="number"
                    min="0"
                    max={Number(line.plannedQuantity) - Number(line.inboundQuantity)}
                    step="0.0001"
                    value={quantities[String(line.id)] ?? ""}
                    onChange={(event) =>
                      setQuantities({ ...quantities, [String(line.id)]: event.target.value })
                    }
                  />
                </td>
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
        <Button
          disabled={
            saving ||
            !source ||
            !performed ||
            !warehouseId ||
            !lines.some((line) => Number(quantities[String(line.id)]) > 0)
          }
          type="submit"
        >
          {saving ? "保存中…" : "确认保存"}
        </Button>
      </div>
    </form>
  );
}
export const inboundHeaders = [
  "入库日期",
  "生产单号",
  "生产厂家",
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
    row.productionOrderNo,
    row.manufacturerName,
    lines.map((line) => line.skuCodeSnapshot).join("、"),
    row.totalQuantity,
    row.inspectionPerformed == null ? "历史未记录" : row.inspectionPerformed ? "是" : "否",
    row.inspectorName,
    row.warehouseName,
    row.status === "completed" ? "已入库" : "历史记录",
  ];
}
export function ProductionInboundListCells({ row }: { row: Row }) {
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
export function ProductionInboundDetail({ row }: { row: Row }) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-5 text-slate-900">
      <h3 className="font-semibold">成品入库信息</h3>
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
