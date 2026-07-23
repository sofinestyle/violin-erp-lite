import type { PermissionCode } from "@violin-erp/api";

export type WorkflowView = Readonly<{
  apiPath: string;
  createApiPath?: string;
  createPermission?: PermissionCode;
  description: string;
  detailPath: string;
  historyPath?: string;
  id: string;
  label: string;
  sourceType?: "production" | "purchase";
}>;

export const procurementViews: readonly WorkflowView[] = [
  {
    apiPath: "/api/v1/purchase-orders",
    createApiPath: "/api/v1/purchase-orders",
    createPermission: "purchase.order.create",
    description: "采购订单独立管理；付款仅记录采购事实，不触发生产。",
    detailPath: "/api/v1/purchase-orders/{id}",
    historyPath: "/api/v1/purchase-orders/{id}/status-history",
    id: "purchase-orders",
    label: "采购订单",
  },
  {
    apiPath: "/api/v1/purchase-orders/{parentId}/payments",
    createApiPath: "/api/v1/purchase-orders/{parentId}/payments",
    createPermission: "purchase.payment.create",
    description: "按采购订单查询与登记付款事实；付款不改变采购完成状态。",
    detailPath: "/api/v1/purchase-payments/{id}",
    id: "purchase-payments",
    label: "采购付款",
  },
  {
    apiPath: "/api/v1/inspection-orders?sourceType=purchase",
    createApiPath: "/api/v1/inspection-orders",
    createPermission: "inspection.order.create",
    description: "仅展示采购来源验收，确认合格后方可进入采购入库。",
    detailPath: "/api/v1/inspection-orders/{id}",
    historyPath: "/api/v1/inspection-orders/{id}/status-history",
    id: "purchase-inspections",
    label: "采购验收",
    sourceType: "purchase",
  },
  {
    apiPath: "/api/v1/inbound-orders?sourceDocumentType=purchase_order",
    createApiPath: "/api/v1/inbound-orders/purchase",
    createPermission: "inbound.order.create-purchase",
    description: "仅处理采购来源正式入库。",
    detailPath: "/api/v1/inbound-orders/{id}",
    historyPath: "/api/v1/inbound-orders/{id}/status-history",
    id: "purchase-inbound",
    label: "采购入库",
    sourceType: "purchase",
  },
];

export const productionViews: readonly WorkflowView[] = [
  {
    apiPath: "/api/v1/production-orders",
    createApiPath: "/api/v1/production-orders",
    createPermission: "production.order.create",
    description: "生产订单独立创建，不接收采购订单标识。",
    detailPath: "/api/v1/production-orders/{id}",
    historyPath: "/api/v1/production-orders/{id}/status-history",
    id: "production-orders",
    label: "生产订单",
  },
  {
    apiPath: "/api/v1/production-orders/{parentId}/progress-records",
    createApiPath: "/api/v1/production-orders/{parentId}/progress-records",
    createPermission: "production.progress.create",
    description: "按生产订单登记执行进度，不引用采购订单。",
    detailPath: "/api/v1/production-progress-records/{id}",
    id: "production-progress",
    label: "生产进度",
  },
  {
    apiPath: "/api/v1/production-orders/{parentId}/completion-records",
    createApiPath: "/api/v1/production-orders/{parentId}/completion-records",
    createPermission: "production.completion.create",
    description: "按生产订单登记并确认分批完工。",
    detailPath: "/api/v1/production-completion-records/{id}",
    id: "production-completions",
    label: "分批完工",
  },
  {
    apiPath: "/api/v1/inspection-orders?sourceType=production",
    createApiPath: "/api/v1/inspection-orders",
    createPermission: "inspection.order.create",
    description: "仅展示生产来源验收，来源与采购验收严格互斥。",
    detailPath: "/api/v1/inspection-orders/{id}",
    historyPath: "/api/v1/inspection-orders/{id}/status-history",
    id: "production-inspections",
    label: "生产验收",
    sourceType: "production",
  },
  {
    apiPath: "/api/v1/inbound-orders?sourceDocumentType=production_order",
    createApiPath: "/api/v1/inbound-orders/production",
    createPermission: "inbound.order.create-production",
    description: "仅处理生产来源正式入库。",
    detailPath: "/api/v1/inbound-orders/{id}",
    historyPath: "/api/v1/inbound-orders/{id}/status-history",
    id: "production-inbound",
    label: "生产入库",
    sourceType: "production",
  },
];

export const inboundViews: readonly WorkflowView[] = [procurementViews[3]!, productionViews[4]!];
