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

export const inventoryViews: readonly WorkflowView[] = [
  {
    apiPath: "/api/v1/inventories",
    description: "按正式仓库数据范围查询库存余额；库存余额不可由页面直接编辑。",
    detailPath: "/api/v1/inventories/{id}",
    id: "inventory-balances",
    label: "库存余额",
  },
  {
    apiPath: "/api/v1/inventory-transactions",
    description: "查询由正式库存事务原子生成的不可变库存流水。",
    detailPath: "/api/v1/inventory-transactions/{id}",
    id: "inventory-ledger",
    label: "库存流水",
  },
  {
    apiPath: "/api/v1/inventory-adjustments",
    createApiPath: "/api/v1/inventory-adjustments",
    createPermission: "inventory.adjustment.create",
    description: "库存调整须完成审批后执行，执行时原子更新余额与库存流水。",
    detailPath: "/api/v1/inventory-adjustments/{id}",
    historyPath: "/api/v1/inventory-adjustments/{id}/status-history",
    id: "inventory-adjustments",
    label: "库存调整",
  },
  {
    apiPath: "/api/v1/inventory-alerts",
    description: "查询并处理库存预警，不直接修改库存。",
    detailPath: "/api/v1/inventory-alerts/{id}",
    id: "inventory-alerts",
    label: "库存预警",
  },
];

export const warehouseOperationViews: readonly WorkflowView[] = [
  {
    apiPath: "/api/v1/transfer-orders",
    createApiPath: "/api/v1/transfer-orders",
    createPermission: "transfer.order.create",
    description: "调拨发运执行来源仓到在途仓，收货执行在途仓到目标仓的成对库存事务。",
    detailPath: "/api/v1/transfer-orders/{id}",
    historyPath: "/api/v1/transfer-orders/{id}/status-history",
    id: "transfer-orders",
    label: "库存调拨",
  },
  {
    apiPath: "/api/v1/stock-counts",
    createApiPath: "/api/v1/stock-counts",
    createPermission: "inventory.stock-count.create",
    description: "开始盘点时冻结账面快照；完成盘点不直接修改库存。",
    detailPath: "/api/v1/stock-counts/{id}",
    historyPath: "/api/v1/stock-counts/{id}/status-history",
    id: "stock-counts",
    label: "库存盘点",
  },
  {
    apiPath: "/api/v1/damage-reports",
    createApiPath: "/api/v1/damage-reports",
    createPermission: "inventory.damage.create",
    description: "报损确认出库时才扣减库存并生成库存流水。",
    detailPath: "/api/v1/damage-reports/{id}",
    historyPath: "/api/v1/damage-reports/{id}/status-history",
    id: "damage-reports",
    label: "库存报损",
  },
  {
    apiPath: "/api/v1/outbound-orders?outboundType=domestic_sales",
    createApiPath: "/api/v1/outbound-orders/domestic-sales",
    createPermission: "outbound.order.create-domestic-sales",
    description: "仅处理国内销售出库，不建立销售订单。",
    detailPath: "/api/v1/outbound-orders/{id}",
    historyPath: "/api/v1/outbound-orders/{id}/status-history",
    id: "domestic-outbound",
    label: "国内销售出库",
  },
  {
    apiPath: "/api/v1/sales-returns",
    createApiPath: "/api/v1/sales-returns",
    createPermission: "outbound.sales-return.create",
    description: "销售退货确认入库时按正式处置数量恢复库存并生成流水。",
    detailPath: "/api/v1/sales-returns/{id}",
    historyPath: "/api/v1/sales-returns/{id}/status-history",
    id: "sales-returns",
    label: "销售退货",
  },
];

export const crossBorderViews: readonly WorkflowView[] = [
  {
    apiPath: "/api/v1/cross-border-shipments",
    createApiPath: "/api/v1/cross-border-shipments",
    createPermission: "cross-border.shipment.create",
    description: "按厂家仓、在途仓、海外仓模型管理跨境发货；运输方式为必填自由文本。",
    detailPath: "/api/v1/cross-border-shipments/{id}",
    historyPath: "/api/v1/cross-border-shipments/{id}/status-history",
    id: "cross-border-shipments",
    label: "跨境发货",
  },
  {
    apiPath: "/api/v1/overseas-inventories",
    description: "查询海外仓正式库存，不新增独立海外仓 API 或数据源。",
    detailPath: "/api/v1/overseas-inventories/{id}/source-trace",
    id: "overseas-inventories",
    label: "海外仓库存",
  },
  {
    apiPath: "/api/v1/overseas-inventory-imports",
    description: "查询正式海外库存导入结果与来源追溯。",
    detailPath: "/api/v1/overseas-inventory-imports/{id}",
    id: "overseas-imports",
    label: "海外库存导入",
  },
];
