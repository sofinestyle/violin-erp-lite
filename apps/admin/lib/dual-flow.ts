import type { WorkflowView } from "./workflow";

type BusinessRow = Record<string, unknown> & { id: string };

export function isDualFlow(view: WorkflowView): boolean {
  return /^(purchase|production)-/.test(view.id);
}

export function dualFlowStatusOptions(
  view: WorkflowView,
): readonly (readonly [string, string])[] | undefined {
  if (view.id === "production-completions")
    return [
      ["Draft", "待完工确认"],
      ["Confirmed", "已确认"],
      ["Revoked", "已撤销"],
      ["Voided", "已作废"],
    ];
  if (view.id.endsWith("-inspections"))
    return [
      ["draft", "待质检"],
      ["pending_confirmation", "待确认"],
      ["confirmed", "已确认"],
      ["revoked", "已撤销"],
      ["voided", "已作废"],
    ];
  if (
    !["purchase-orders", "production-orders", "purchase-inbound", "production-inbound"].includes(
      view.id,
    )
  )
    return undefined;
  const base: [string, string][] = [
    ["draft", "草稿"],
    ["pending_approval", "已提交 / 待审核"],
    ["approved", "已审核"],
    ["rejected", "已驳回"],
  ];
  if (view.id === "production-orders")
    base.push(
      ["in_production", "生产中"],
      ["partially_completed", "部分完工"],
      ["completed", "已完工"],
    );
  else if (view.id.endsWith("-inbound"))
    base.push(
      ["partially_completed", "部分入库"],
      ["completed", "已确认入库"],
      ["reversed", "已冲销"],
    );
  else base.push(["completed", "已完成"]);
  return [...base, ["cancelled", "已取消"], ["voided", "已作废"]];
}

export function eligibleSourceRows(view: WorkflowView, key: string, rows: readonly BusinessRow[]) {
  if (key === "purchaseInspections" || key === "productionInspections") {
    const sourceType = key === "purchaseInspections" ? "purchase" : "production";
    return rows.filter((row) => row.sourceType === sourceType && row.status === "confirmed");
  }
  if (view.id === "purchase-inspections" && key === "purchaseOrders") {
    return rows.filter((row) => row.status === "approved");
  }
  if (view.id === "production-inspections" && key === "productionOrders") {
    return rows.filter((row) =>
      ["approved", "in_production", "partially_completed", "completed"].includes(
        String(row.status),
      ),
    );
  }
  if (
    ["production-progress", "production-completions"].includes(view.id) &&
    key === "productionOrders"
  ) {
    return rows.filter((row) =>
      ["approved", "in_production", "partially_completed"].includes(String(row.status)),
    );
  }
  return rows;
}

export function sourceContextFor(view: WorkflowView, source: BusinessRow): Record<string, unknown> {
  if (view.id.endsWith("-inbound") && view.sourceType) {
    if (source.sourceType !== view.sourceType || source.status !== "confirmed") {
      throw new Error(
        `请选择已确认的${view.sourceType === "purchase" ? "采购质检" : "成品质检"}单。`,
      );
    }
    const field = view.sourceType === "purchase" ? "purchaseOrderId" : "productionOrderId";
    if (!source[field]) throw new Error("质检单缺少正式来源，请刷新后重试。");
    return { [field]: source[field] };
  }
  if (view.id === "production-completions") {
    if (!source.versionNo) throw new Error("生产订单信息已变化，请重新选择。");
    return { productionOrderVersionNo: source.versionNo };
  }
  return {};
}

export function availableSourceQuantity(
  view: WorkflowView,
  item: BusinessRow,
  order?: BusinessRow,
): number | undefined {
  if (view.id.endsWith("-inspections")) {
    return Math.max(
      0,
      Number(view.sourceType === "purchase" ? item.quantity : (item.completedQuantity ?? 0)) -
        Number(item.inspectedQuantity ?? 0),
    );
  }
  if (view.id === "production-completions") {
    return Math.max(0, Number(item.plannedQuantity) - Number(item.completedQuantity ?? 0));
  }
  if (view.id.endsWith("-inbound")) {
    const relation = view.sourceType === "purchase" ? "purchaseOrderItems" : "productionOrderItems";
    const sourceItems = (order?.[relation] ?? []) as BusinessRow[];
    const sourceItem = sourceItems.find((row) => row.id === item.sourceItemId);
    if (!sourceItem) return 0;
    return Math.max(
      0,
      Math.min(
        Number(item.qualifiedQuantity),
        Number(sourceItem.qualifiedQuantity) - Number(sourceItem.inboundQuantity ?? 0),
      ),
    );
  }
  return undefined;
}

export function actionStateAllowed(view: WorkflowView, action: string, row: BusinessRow): boolean {
  if (!isDualFlow(view)) return true;
  if (view.id === "production-completions") {
    const state = String(row.completionStatus).toLowerCase();
    return action === "revoke" ? state === "confirmed" : state === "draft";
  }
  const state = String(row.status);
  if (view.id.endsWith("-inspections")) {
    return (
      (
        {
          submit: ["draft"],
          confirm: ["pending_confirmation"],
          revoke: ["confirmed"],
          void: ["draft", "pending_confirmation"],
        } as Record<string, string[]>
      )[action]?.includes(state) ?? false
    );
  }
  return (
    (
      {
        submit: ["draft", "rejected"],
        withdraw: ["pending_approval"],
        approve: ["pending_approval"],
        reject: ["pending_approval"],
        unapprove: ["approved"],
        start: ["approved"],
        cancel: ["draft"],
        confirm: ["approved", "partially_completed"],
        reverse: ["completed"],
      } as Record<string, string[]>
    )[action]?.includes(state) ?? false
  );
}

export function dualActionPayload(
  view: WorkflowView,
  action: string,
  row: BusinessRow,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  if (view.id === "production-completions") return extras;
  if (row.versionNo === undefined || row.versionNo === null)
    throw new Error("单据信息已变化，请刷新后重试。");
  const payload: Record<string, unknown> = { versionNo: row.versionNo, ...extras };
  if (view.id === "production-orders" && action === "start") {
    if (!extras.actualStartDate || !extras.progressDescription)
      throw new Error("请填写实际开始日期和生产说明。");
  }
  if (view.id.endsWith("-inbound") && action === "confirm" && row.status === "approved") {
    payload.items = ((row.inboundOrderItems ?? []) as BusinessRow[]).map((item) => ({
      inboundOrderItemId: item.id,
      quantity: item.quantity,
    }));
  }
  return payload;
}
