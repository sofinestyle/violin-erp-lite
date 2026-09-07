import { ConflictError, ForbiddenError } from "../errors/app-error.js";

export function isUatPurchaseOrder(order: { documentNo?: unknown; remark?: unknown }): boolean {
  return [order.documentNo, order.remark].some(
    (value) => typeof value === "string" && /^UAT-[A-Z0-9]+(?:[-\s:：]|$)/.test(value.trim()),
  );
}

export function assertPurchaseDeleteState(
  order: { status: string; documentNo?: unknown; remark?: unknown },
  administrator: boolean,
): void {
  if (order.status === "draft") return;
  if (order.status === "cancelled" && !administrator) {
    throw new ForbiddenError("仅管理员可以删除已取消的测试采购订单");
  }
  if (order.status === "cancelled" && isUatPurchaseOrder(order)) return;
  throw new ConflictError("当前状态的采购订单不允许删除。");
}
