import { ConflictError, ValidationError } from "@violin-erp/api";

type Row = Record<string, unknown>;
export function procurementInspector(payload: Row): {
  inspector_name: string;
  inspector_id: null;
  inspection_warehouse_id: null;
} {
  if (payload.inspectorId != null || payload.inspectionWarehouseId != null)
    throw new ValidationError("采购质检请填写质检员姓名，不填写质检仓库或账号");
  const name = typeof payload.inspectorName === "string" ? payload.inspectorName.trim() : "";
  if (!name || name.length > 100) throw new ValidationError("质检员姓名必须为 1—100 个字符");
  return { inspector_name: name, inspector_id: null, inspection_warehouse_id: null };
}
export function assertWholeProcurement(
  source: Row[],
  lines: Row[],
  stage: "inspection" | "inbound",
) {
  const expected = new Map(
    source
      .map((item) => [
        String(item.id),
        stage === "inspection"
          ? Number(item.quantity) - Number(item.inspected_quantity ?? 0)
          : Number(item.qualified_quantity ?? 0) - Number(item.inbound_quantity ?? 0),
      ])
      .filter((entry): entry is [string, number] => Number(entry[1]) > 0),
  );
  const seen = new Set<string>();
  for (const line of lines) {
    const id = String(line.source_item_id ?? line.source_document_item_id);
    const quantity = Number(stage === "inspection" ? line.inspected_quantity : line.quantity);
    if (seen.has(id) || !expected.has(id) || Math.abs(quantity - expected.get(id)!) > 0.00001)
      throw new ValidationError("采购必须整单一次执行，数量必须覆盖全部待处理明细");
    seen.add(id);
  }
  if (!expected.size || seen.size !== expected.size)
    throw new ConflictError("采购必须覆盖全部待处理数量，当前明细不完整或已处理");
}
