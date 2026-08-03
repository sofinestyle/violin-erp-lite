"use client";

import { Eye, Plus, RefreshCw, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { useUser } from "@/contexts/user-context";
import { authenticatedFetch } from "@/lib/auth-client";
import type { WorkflowView } from "@/lib/workflow";
import type { PermissionCode } from "@violin-erp/api";

type Envelope = Readonly<{
  data?: unknown;
  error?: {
    code?: string;
    details?: readonly { field?: string; line?: number; message: string }[];
    message?: string;
  };
  meta?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  requestId?: string;
  success?: boolean;
}>;

type Row = Record<string, unknown> & { id: string };
type Option = Readonly<{ label: string; raw: Row; value: string }>;
type OptionsMap = Record<string, readonly Option[]>;

type FieldType = "date" | "number" | "select" | "text" | "textarea";
type FieldDefinition = Readonly<{
  key: string;
  label: string;
  optionKey?: string;
  placeholder?: string;
  required?: boolean;
  type?: FieldType;
  values?: readonly { label: string; value: string }[];
}>;

type ItemFieldDefinition = FieldDefinition &
  Readonly<{
    derived?: true;
    sourceOptionKey?: string;
  }>;

type OptionSource = Readonly<{
  key: string;
  labelFields: readonly string[];
  path: string;
}>;

type SourceItems = Readonly<{
  dependsOn: string;
  itemLabelFields: readonly string[];
  itemRelation: string;
  key: string;
  inject?: (item: Row) => Record<string, unknown>;
}>;

type BusinessForm = Readonly<{
  defaults?: Record<string, string>;
  fields: readonly FieldDefinition[];
  itemFields?: readonly ItemFieldDefinition[];
  optionSources?: readonly OptionSource[];
  sourceItems?: SourceItems;
}>;

type WorkflowAction = Readonly<{
  action: string;
  label: string;
  permission: PermissionCode;
  requiresReason?: boolean;
}>;

const PAGE_SIZE = 20;

export const WORKFLOW_SURFACE_CLASSES = {
  detailCard:
    "mt-5 border-slate-200 !bg-white p-4 text-slate-950 shadow-sm dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  dialogBody: "overflow-y-auto !bg-white p-6 dark:!bg-slate-950",
  dialogContent:
    "relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 !bg-white text-slate-950 shadow-2xl dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  dialogFooter:
    "flex justify-end gap-2 border-t border-slate-200 !bg-white p-6 dark:border-slate-800 dark:!bg-slate-950",
  dialogHeader:
    "flex items-center justify-between border-b border-slate-200 !bg-white p-6 dark:border-slate-800 dark:!bg-slate-950",
  dialogOverlay: "fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4",
  drawerContent:
    "relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 !bg-white p-6 text-slate-950 shadow-2xl dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  drawerOverlay: "fixed inset-0 z-50 flex justify-end bg-slate-950/45",
  fieldPanel:
    "rounded-lg border border-slate-200 !bg-white p-3 text-slate-950 dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  formControl:
    "mt-2 h-10 w-full rounded-md border border-slate-300 !bg-white px-3 text-sm text-slate-950 shadow-sm dark:border-slate-700 dark:!bg-slate-950 dark:text-slate-50",
  historyCard:
    "mt-4 border-slate-200 !bg-white p-4 text-slate-950 shadow-sm dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  sectionCard:
    "mt-5 border-slate-200 !bg-white p-4 text-slate-950 shadow-sm dark:border-slate-800 dark:!bg-slate-950 dark:text-slate-50",
  textareaControl:
    "mt-2 min-h-24 w-full rounded-md border border-slate-300 !bg-white p-3 text-sm text-slate-950 shadow-sm dark:border-slate-700 dark:!bg-slate-950 dark:text-slate-50",
} as const;

const STATUS_LABELS: Record<string, string> = {
  approved: "已审核",
  cancelled: "已取消",
  completed: "已完成",
  confirmed: "已确认",
  dispatched: "已发货",
  draft: "草稿",
  executed: "已执行",
  failed: "失败",
  in_production: "生产中",
  not_required: "无需审批",
  not_submitted: "未提交",
  pending: "待处理",
  pending_approval: "待审核",
  qualified: "合格",
  rejected: "已驳回",
  submitted: "已提交",
  unqualified: "不合格",
  voided: "已作废",
};

const STATUS_FILTERS = [
  ["draft", "草稿"],
  ["submitted", "已提交"],
  ["pending_approval", "待审核"],
  ["approved", "已审核"],
  ["in_production", "生产中"],
  ["confirmed", "已确认"],
  ["completed", "已完成"],
  ["cancelled", "已取消"],
  ["voided", "已作废"],
] as const;

const BASIC_FIELDS: Record<string, string> = {
  adjustmentReason: "调整原因",
  adjustmentType: "调整类型",
  alertNo: "预警编号",
  availableQuantity: "可用库存",
  carrierName: "承运商",
  completionBatchNo: "完工批次",
  completedQuantity: "完成数量",
  customerName: "客户名称",
  destinationCountry: "目的国家",
  documentDate: "单据日期",
  documentNo: "单据编号",
  expectedCompletionDate: "预计完成日期",
  expectedDeliveryDate: "预计交付日期",
  externalOrderNo: "外部订单号",
  externalReturnNo: "外部退货号",
  generatedAt: "生成时间",
  id: "内部标识",
  inspectionDate: "验收日期",
  inspectionResult: "验收结果",
  onHandQuantity: "账面库存",
  paidAmount: "已付款金额",
  pendingQuantity: "待处理库存",
  plannedStartDate: "计划开始日期",
  progressDate: "进度日期",
  progressDescription: "进度说明",
  progressPercentage: "进度百分比",
  quantity: "数量",
  remark: "备注",
  reservedQuantity: "占用库存",
  returnDate: "退货日期",
  returnReason: "退货原因",
  settlementMethod: "结算方式",
  shipmentBatchNo: "发货批次",
  status: "状态",
  subtotalAmount: "小计金额",
  totalAmount: "总金额",
  totalCompletedQuantity: "完工数量",
  totalQuantity: "总数量",
  trackingNo: "运单号",
  transactionAt: "发生时间",
  transactionNo: "流水编号",
  transportMethod: "运输方式",
  unpaidAmount: "未付款金额",
  updatedAt: "更新时间",
  versionNo: "版本号",
};

const OPTION_SOURCES = {
  manufacturers: {
    key: "manufacturers",
    labelFields: ["manufacturerCode", "manufacturerName"],
    path: "/api/v1/manufacturers/options?page=1&pageSize=100",
  },
  outboundOrders: {
    key: "outboundOrders",
    labelFields: ["documentNo", "externalOrderNo", "customerName"],
    path: "/api/v1/outbound-orders?outboundType=domestic_sales&page=1&pageSize=100",
  },
  platforms: {
    key: "platforms",
    labelFields: ["platformCode", "platformName"],
    path: "/api/v1/ecommerce-platforms/options?page=1&pageSize=100",
  },
  productionInspections: {
    key: "productionInspections",
    labelFields: ["documentNo", "inspectionResult", "status"],
    path: "/api/v1/inspection-orders?sourceType=production&page=1&pageSize=100",
  },
  productionOrders: {
    key: "productionOrders",
    labelFields: ["documentNo", "manufacturerNameSnapshot", "status"],
    path: "/api/v1/production-orders?page=1&pageSize=100",
  },
  purchaseInspections: {
    key: "purchaseInspections",
    labelFields: ["documentNo", "inspectionResult", "status"],
    path: "/api/v1/inspection-orders?sourceType=purchase&page=1&pageSize=100",
  },
  purchaseOrders: {
    key: "purchaseOrders",
    labelFields: ["documentNo", "supplierNameSnapshot", "status"],
    path: "/api/v1/purchase-orders?page=1&pageSize=100",
  },
  skus: {
    key: "skus",
    labelFields: ["skuCode", "skuName", "specification"],
    path: "/api/v1/skus/options?page=1&pageSize=100",
  },
  stores: {
    key: "stores",
    labelFields: ["storeCode", "storeName"],
    path: "/api/v1/stores/options?page=1&pageSize=100",
  },
  suppliers: {
    key: "suppliers",
    labelFields: ["supplierCode", "supplierName"],
    path: "/api/v1/suppliers/options?page=1&pageSize=100",
  },
  warehouses: {
    key: "warehouses",
    labelFields: ["warehouseCode", "warehouseName", "warehouseType"],
    path: "/api/v1/warehouses/options?page=1&pageSize=100",
  },
} satisfies Record<string, OptionSource>;

const createNumberField = (key: string, label: string, required = true): ItemFieldDefinition => ({
  key,
  label,
  required,
  type: "number",
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formFor(view: WorkflowView): BusinessForm | null {
  const defaults = { documentDate: today(), returnDate: today(), inspectionDate: today() };
  if (view.id === "purchase-orders") {
    return {
      defaults,
      fields: [
        { key: "documentDate", label: "采购日期", required: true, type: "date" },
        {
          key: "supplierId",
          label: "供应商",
          optionKey: "suppliers",
          required: true,
          type: "select",
        },
        { key: "expectedDeliveryDate", label: "预计交付日", required: true, type: "date" },
        { key: "settlementMethod", label: "结算方式", required: true, type: "text" },
        { key: "remark", label: "备注", type: "textarea" },
      ],
      itemFields: [
        { key: "skuId", label: "SKU", optionKey: "skus", required: true, type: "select" },
        createNumberField("quantity", "采购数量"),
        createNumberField("unitPrice", "单价"),
        { key: "taxRate", label: "税率", required: true, type: "number" },
        { key: "expectedDeliveryDate", label: "明细交期", type: "date" },
      ],
      optionSources: [OPTION_SOURCES.suppliers, OPTION_SOURCES.skus],
    };
  }
  if (view.id === "purchase-payments") {
    return {
      fields: [
        {
          key: "parentId",
          label: "采购订单",
          optionKey: "purchaseOrders",
          required: true,
          type: "select",
        },
        { key: "paymentDate", label: "付款日期", required: true, type: "date" },
        { key: "paymentAmount", label: "付款金额", required: true, type: "number" },
        { key: "paymentMethod", label: "付款方式", required: true, type: "text" },
        { key: "payeeAccountSnapshot", label: "收款账户快照", required: true, type: "text" },
        { key: "remark", label: "备注", type: "textarea" },
      ],
      defaults: { paymentDate: today() },
      optionSources: [OPTION_SOURCES.purchaseOrders],
    };
  }
  if (view.id === "production-orders") {
    return {
      defaults,
      fields: [
        { key: "documentDate", label: "生产日期", required: true, type: "date" },
        {
          key: "manufacturerId",
          label: "生产厂家",
          optionKey: "manufacturers",
          required: true,
          type: "select",
        },
        { key: "plannedStartDate", label: "计划开始日", required: true, type: "date" },
        { key: "expectedCompletionDate", label: "预计完成日", required: true, type: "date" },
        { key: "remark", label: "备注", type: "textarea" },
      ],
      itemFields: [
        { key: "skuId", label: "SKU", optionKey: "skus", required: true, type: "select" },
        createNumberField("plannedQuantity", "计划数量"),
        createNumberField("processingUnitPrice", "加工单价"),
      ],
      optionSources: [OPTION_SOURCES.manufacturers, OPTION_SOURCES.skus],
    };
  }
  if (view.id === "production-progress") {
    return {
      defaults: { progressDate: today() },
      fields: [
        {
          key: "parentId",
          label: "生产任务",
          optionKey: "productionOrders",
          required: true,
          type: "select",
        },
        { key: "progressDate", label: "进度日期", required: true, type: "date" },
        { key: "progressStage", label: "进度阶段", required: true, type: "text" },
        { key: "progressPercentage", label: "进度百分比", required: true, type: "number" },
        { key: "completedQuantity", label: "完成数量", required: true, type: "number" },
        { key: "progressDescription", label: "进度说明", required: true, type: "textarea" },
      ],
      optionSources: [OPTION_SOURCES.productionOrders],
    };
  }
  if (view.id === "production-completions") {
    return {
      defaults: { completionDate: today() },
      fields: [
        {
          key: "parentId",
          label: "生产任务",
          optionKey: "productionOrders",
          required: true,
          type: "select",
        },
        { key: "completionBatchNo", label: "完工批次", required: true, type: "text" },
        { key: "completionDate", label: "完工日期", required: true, type: "date" },
        {
          key: "warehouseId",
          label: "入库准备仓库",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        {
          key: "productionOrderVersionNo",
          label: "生产任务版本号",
          required: true,
          type: "number",
        },
      ],
      itemFields: [
        {
          key: "productionOrderItemId",
          label: "生产明细",
          optionKey: "sourceItems",
          required: true,
          type: "select",
        },
        { derived: true, key: "skuId", label: "SKU", sourceOptionKey: "sourceItems" },
        createNumberField("completedQuantity", "完工数量"),
      ],
      optionSources: [OPTION_SOURCES.productionOrders, OPTION_SOURCES.warehouses],
      sourceItems: {
        dependsOn: "parentId",
        inject: (item) => ({ skuId: item.skuId }),
        itemLabelFields: ["skuCodeSnapshot", "skuNameSnapshot", "plannedQuantity"],
        itemRelation: "productionOrderItems",
        key: "sourceItems",
      },
    };
  }
  if (view.id === "purchase-inspections" || view.id === "production-inspections") {
    const purchase = view.sourceType === "purchase";
    return {
      defaults: { inspectionDate: today(), sourceType: view.sourceType ?? "purchase" },
      fields: [
        {
          key: purchase ? "purchaseOrderId" : "productionOrderId",
          label: purchase ? "采购来源单" : "生产来源单",
          optionKey: purchase ? "purchaseOrders" : "productionOrders",
          required: true,
          type: "select",
        },
        { key: "inspectionDate", label: "验收日期", required: true, type: "date" },
        {
          key: "inspectionWarehouseId",
          label: "验收仓库",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        { key: "remark", label: "验收说明", type: "textarea" },
      ],
      itemFields: [
        {
          key: "sourceItemId",
          label: "来源明细",
          optionKey: "sourceItems",
          required: true,
          type: "select",
        },
        { derived: true, key: "skuId", label: "SKU", sourceOptionKey: "sourceItems" },
        createNumberField("inspectedQuantity", "验收数量"),
        createNumberField("qualifiedQuantity", "合格数量"),
        createNumberField("unqualifiedQuantity", "不合格数量"),
        {
          key: "inspectionResult",
          label: "验收结果",
          required: true,
          type: "select",
          values: [
            { label: "合格", value: "qualified" },
            { label: "不合格", value: "unqualified" },
            { label: "待处理", value: "pending" },
          ],
        },
        { key: "remark", label: "明细说明", type: "text" },
      ],
      optionSources: [
        purchase ? OPTION_SOURCES.purchaseOrders : OPTION_SOURCES.productionOrders,
        OPTION_SOURCES.warehouses,
      ],
      sourceItems: {
        dependsOn: purchase ? "purchaseOrderId" : "productionOrderId",
        inject: (item) => ({ skuId: item.skuId }),
        itemLabelFields: [
          "skuCodeSnapshot",
          "skuNameSnapshot",
          purchase ? "quantity" : "plannedQuantity",
        ],
        itemRelation: purchase ? "purchaseOrderItems" : "productionOrderItems",
        key: "sourceItems",
      },
    };
  }
  if (view.id === "purchase-inbound" || view.id === "production-inbound") {
    const purchase = view.sourceType === "purchase";
    return {
      defaults,
      fields: [
        {
          key: purchase ? "purchaseOrderId" : "productionOrderId",
          label: purchase ? "采购来源单" : "生产来源单",
          optionKey: purchase ? "purchaseOrders" : "productionOrders",
          required: true,
          type: "select",
        },
        {
          key: "inspectionOrderId",
          label: "已确认验收单",
          optionKey: purchase ? "purchaseInspections" : "productionInspections",
          required: true,
          type: "select",
        },
        { key: "documentDate", label: "入库日期", required: true, type: "date" },
        {
          key: "warehouseId",
          label: "目标仓库",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        { key: "remark", label: "备注", type: "textarea" },
      ],
      itemFields: [
        {
          key: "inspectionOrderItemId",
          label: "验收明细",
          optionKey: "sourceItems",
          required: true,
          type: "select",
        },
        {
          derived: true,
          key: purchase ? "purchaseOrderItemId" : "productionOrderItemId",
          label: "来源明细",
          sourceOptionKey: "sourceItems",
        },
        { derived: true, key: "skuId", label: "SKU", sourceOptionKey: "sourceItems" },
        createNumberField("quantity", "入库数量"),
        createNumberField("unitCost", "单位成本"),
        { key: "inventoryCondition", label: "库存状态", required: true, type: "text" },
        { key: "batchNo", label: "批次号", type: "text" },
      ],
      optionSources: [
        purchase ? OPTION_SOURCES.purchaseOrders : OPTION_SOURCES.productionOrders,
        purchase ? OPTION_SOURCES.purchaseInspections : OPTION_SOURCES.productionInspections,
        OPTION_SOURCES.warehouses,
      ],
      sourceItems: {
        dependsOn: "inspectionOrderId",
        inject: (item) => ({
          [purchase ? "purchaseOrderItemId" : "productionOrderItemId"]: item.sourceItemId,
          skuId: item.skuId,
        }),
        itemLabelFields: ["skuCodeSnapshot", "skuNameSnapshot", "qualifiedQuantity"],
        itemRelation: "inspectionOrderItems",
        key: "sourceItems",
      },
    };
  }
  if (view.id === "inventory-adjustments") {
    return {
      defaults,
      fields: [
        { key: "documentDate", label: "调整日期", required: true, type: "date" },
        {
          key: "warehouseId",
          label: "调整仓库",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        {
          key: "adjustmentType",
          label: "调整类型",
          required: true,
          type: "select",
          values: [
            { label: "盘盈", value: "surplus" },
            { label: "盘亏", value: "shortage" },
            { label: "手工调整", value: "manual" },
          ],
        },
        { key: "adjustmentReason", label: "调整原因", required: true, type: "textarea" },
      ],
      itemFields: [
        { key: "skuId", label: "SKU", optionKey: "skus", required: true, type: "select" },
        {
          key: "adjustmentDirection",
          label: "方向",
          required: true,
          type: "select",
          values: [
            { label: "增加库存", value: "increase" },
            { label: "减少库存", value: "decrease" },
          ],
        },
        createNumberField("adjustmentQuantity", "调整数量"),
        createNumberField("unitCost", "单位成本"),
        { key: "batchNo", label: "批次号", type: "text" },
      ],
      optionSources: [OPTION_SOURCES.warehouses, OPTION_SOURCES.skus],
    };
  }
  if (view.id === "domestic-outbound") {
    return {
      defaults,
      fields: [
        { key: "documentDate", label: "出库日期", required: true, type: "date" },
        {
          key: "warehouseId",
          label: "出库仓库",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        { key: "platformId", label: "平台", optionKey: "platforms", type: "select" },
        { key: "storeId", label: "店铺", optionKey: "stores", type: "select" },
        { key: "externalOrderNo", label: "外部订单号", type: "text" },
        { key: "customerName", label: "客户快照", type: "text" },
        { key: "remark", label: "备注", type: "textarea" },
      ],
      itemFields: [
        { key: "skuId", label: "SKU", optionKey: "skus", required: true, type: "select" },
        createNumberField("quantity", "出库数量"),
        createNumberField("unitCost", "单位成本"),
        { key: "externalSkuCode", label: "外部 SKU", type: "text" },
      ],
      optionSources: [
        OPTION_SOURCES.warehouses,
        OPTION_SOURCES.platforms,
        OPTION_SOURCES.stores,
        OPTION_SOURCES.skus,
      ],
    };
  }
  if (view.id === "cross-border-shipments") {
    return {
      defaults,
      fields: [
        { key: "documentDate", label: "发货日期", required: true, type: "date" },
        {
          key: "sourceWarehouseId",
          label: "来源仓",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        {
          key: "transitWarehouseId",
          label: "在途仓",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        {
          key: "destinationWarehouseId",
          label: "海外仓",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        { key: "shipmentBatchNo", label: "发货批次", required: true, type: "text" },
        { key: "carrierName", label: "承运商", required: true, type: "text" },
        { key: "trackingNo", label: "运单号", required: true, type: "text" },
        { key: "transportMethod", label: "运输方式", required: true, type: "text" },
        { key: "departureDate", label: "出发日期", required: true, type: "date" },
        { key: "estimatedArrivalDate", label: "预计到达", required: true, type: "date" },
        { key: "destinationCountry", label: "目的国家", required: true, type: "text" },
      ],
      itemFields: [
        { key: "skuId", label: "SKU", optionKey: "skus", required: true, type: "select" },
        createNumberField("quantity", "发货数量"),
        createNumberField("unitCost", "单位成本"),
        { key: "batchNo", label: "批次号", type: "text" },
      ],
      optionSources: [OPTION_SOURCES.warehouses, OPTION_SOURCES.skus],
    };
  }
  if (view.id === "sales-returns") {
    return {
      defaults: { returnDate: today() },
      fields: [
        {
          key: "outboundOrderId",
          label: "原销售出库单",
          optionKey: "outboundOrders",
          required: true,
          type: "select",
        },
        { key: "storeId", label: "退货店铺", optionKey: "stores", required: true, type: "select" },
        {
          key: "returnWarehouseId",
          label: "退货接收仓",
          optionKey: "warehouses",
          required: true,
          type: "select",
        },
        { key: "returnDate", label: "退货日期", required: true, type: "date" },
        { key: "returnReason", label: "退货原因", required: true, type: "textarea" },
        { key: "externalReturnNo", label: "外部退货号", type: "text" },
      ],
      itemFields: [
        {
          key: "outboundOrderItemId",
          label: "原出库明细",
          optionKey: "sourceItems",
          required: true,
          type: "select",
        },
        { derived: true, key: "skuId", label: "SKU", sourceOptionKey: "sourceItems" },
        createNumberField("returnedQuantity", "退货数量"),
        createNumberField("sellableQuantity", "可售数量"),
        createNumberField("pendingQuantity", "待处理数量"),
        createNumberField("damagedQuantity", "损坏数量"),
        { key: "inventoryCondition", label: "库存状态", required: true, type: "text" },
        { key: "dispositionMethod", label: "处理结果", required: true, type: "text" },
      ],
      optionSources: [
        OPTION_SOURCES.outboundOrders,
        OPTION_SOURCES.stores,
        OPTION_SOURCES.warehouses,
      ],
      sourceItems: {
        dependsOn: "outboundOrderId",
        inject: (item) => ({ skuId: item.skuId }),
        itemLabelFields: ["skuCodeSnapshot", "skuNameSnapshot", "quantity"],
        itemRelation: "outboundOrderItems",
        key: "sourceItems",
      },
    };
  }
  return null;
}

export function actionsFor(view: WorkflowView): readonly WorkflowAction[] {
  const map = (resource: string, actions: readonly (readonly [string, string, boolean?])[]) =>
    actions.map(([action, label, requiresReason]) => ({
      action,
      label,
      permission: `${resource}.${action}` as PermissionCode,
      ...(requiresReason ? { requiresReason } : {}),
    }));
  if (view.id === "purchase-orders") {
    return map("purchase.order", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["cancel", "取消", true],
    ]);
  }
  if (view.id === "production-orders") {
    return map("production.order", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["start", "开始生产"],
      ["cancel", "取消", true],
    ]);
  }
  if (view.id === "purchase-inspections" || view.id === "production-inspections") {
    return map("inspection.order", [
      ["submit", "提交"],
      ["confirm", "确认验收"],
      ["revoke", "撤销", true],
      ["void", "作废", true],
    ]);
  }
  if (view.id === "purchase-inbound" || view.id === "production-inbound") {
    return map("inbound.order", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["confirm", "确认入库"],
      ["reverse", "冲销", true],
    ]);
  }
  if (view.id === "inventory-adjustments") {
    return map("inventory.adjustment", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["execute", "执行调整"],
      ["cancel", "取消", true],
    ]);
  }
  if (view.id === "domestic-outbound") {
    return map("outbound.order", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["confirm", "确认出库"],
      ["reverse", "冲销", true],
    ]);
  }
  if (view.id === "cross-border-shipments") {
    return map("cross-border.shipment", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["unapprove", "反审核"],
      ["dispatch", "确认发货"],
      ["cancel", "取消", true],
    ]);
  }
  if (view.id === "sales-returns") {
    return map("outbound.sales-return", [
      ["submit", "提交"],
      ["withdraw", "撤回"],
      ["approve", "审核"],
      ["reject", "驳回", true],
      ["confirm-inbound", "退货入库"],
      ["cancel", "取消", true],
    ]);
  }
  if (view.id === "production-completions") {
    return map("production.completion", [
      ["confirm", "确认完工"],
      ["revoke", "撤销", true],
      ["void", "作废", true],
    ]);
  }
  return [];
}

export function formatWorkflowApiError(envelope: Envelope): string {
  const details = envelope.error?.details
    ?.map((detail) => `${detail.field ? `${detail.field}：` : ""}${detail.message}`)
    .filter(Boolean);
  const detailMessage = details?.length ? `；${details.join("；")}` : "";
  const suffix = envelope.requestId ? `（Request ID：${envelope.requestId}）` : "";
  return `${envelope.error?.message ?? "请求失败"}${detailMessage}${suffix}`;
}

async function request(url: string, init: RequestInit = {}): Promise<Envelope> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await authenticatedFetch(url, { ...init, headers });
  const envelope = (await response.json()) as Envelope;
  if (!response.ok || envelope.success !== true) throw new Error(formatWorkflowApiError(envelope));
  return envelope;
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "string") return STATUS_LABELS[value] ?? value;
  if (typeof value === "number") return String(value);
  return "业务明细";
}

function optionLabel(row: Row, fields: readonly string[]): string {
  return (
    fields
      .map((field) => display(row[field]))
      .filter((part) => part && part !== "—")
      .join(" / ") || row.id
  );
}

function toOption(row: Row, source: OptionSource): Option {
  return { label: optionLabel(row, source.labelFields), raw: row, value: row.id };
}

function relationRows(source: Row | null, relation: string): readonly Row[] {
  const value = source?.[relation];
  return Array.isArray(value) ? (value as Row[]) : [];
}

function fieldInputValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function fieldValue(field: FieldDefinition, value: FormDataEntryValue | null): unknown {
  const text = fieldInputValue(value);
  if (!text) return undefined;
  return field.type === "number" ? Number(text) : text;
}

function rowTitle(row: Row): string {
  return display(
    row.documentNo ??
      row.transactionNo ??
      row.alertNo ??
      row.skuCode ??
      row.taskNo ??
      row.paymentNo ??
      row.completionBatchNo,
  );
}

function rowDate(row: Row): string {
  return display(
    row.documentDate ??
      row.transactionAt ??
      row.generatedAt ??
      row.updatedAt ??
      row.paymentDate ??
      row.completionDate ??
      row.returnDate,
  );
}

function rowStatus(row: Row): string {
  return display(
    row.status ??
      row.alertStatus ??
      row.validationStatus ??
      row.paymentStatus ??
      row.completionStatus ??
      row.inspectionResult,
  );
}

function rowQuantity(row: Row): string {
  return display(
    row.totalQuantity ??
      row.onHandQuantity ??
      row.availableQuantity ??
      row.quantity ??
      row.totalRows ??
      row.totalCompletedQuantity,
  );
}

function detailFields(row: Row): readonly [string, unknown][] {
  return Object.entries(row).filter(([key, value]) => {
    if (key === "id") return false;
    if (Array.isArray(value)) return false;
    if (value && typeof value === "object") return false;
    return (
      key in BASIC_FIELDS ||
      /No$|Date$|Status$|Quantity$|Amount$|Name$|Code$|Method$|Reason$|Type$/.test(key)
    );
  });
}

function sourceDetailPath(view: WorkflowView, fieldKey: string, id: string): string | null {
  if (!id) return null;
  if (
    fieldKey === "purchaseOrderId" ||
    (fieldKey === "parentId" && view.id === "purchase-payments")
  ) {
    return `/api/v1/purchase-orders/${encodeURIComponent(id)}`;
  }
  if (fieldKey === "productionOrderId" || fieldKey === "parentId") {
    return `/api/v1/production-orders/${encodeURIComponent(id)}`;
  }
  if (fieldKey === "inspectionOrderId")
    return `/api/v1/inspection-orders/${encodeURIComponent(id)}`;
  if (fieldKey === "outboundOrderId") return `/api/v1/outbound-orders/${encodeURIComponent(id)}`;
  return null;
}

export function WorkflowWorkbench({ view }: Readonly<{ view: WorkflowView }>) {
  const { user } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [parentFilter, setParentFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<OptionsMap>({});
  const [sourceRows, setSourceRows] = useState<readonly Row[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useMemo(() => formFor(view), [view]);
  const actions = useMemo(() => actionsFor(view), [view]);

  const listUrl = useMemo(() => {
    if (view.apiPath.includes("{parentId}")) {
      if (!parentFilter) return null;
      const resolved = view.apiPath.replace("{parentId}", encodeURIComponent(parentFilter));
      return `${resolved}?page=${page}&pageSize=${PAGE_SIZE}`;
    }
    const separator = view.apiPath.includes("?") ? "&" : "?";
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (keyword.trim()) query.set("keyword", keyword.trim());
    if (status) query.set("status", status);
    return `${view.apiPath}${separator}${query}`;
  }, [keyword, page, parentFilter, status, view.apiPath]);

  const sourceItemOptions = useMemo<readonly Option[]>(() => {
    if (!form?.sourceItems) return [];
    return relationRows(sourceRows[0] ?? null, form.sourceItems.itemRelation).map((item) => ({
      label: optionLabel(item, form.sourceItems!.itemLabelFields),
      raw: item,
      value: item.id,
    }));
  }, [form, sourceRows]);

  const allOptions = useMemo<OptionsMap>(
    () => ({ ...options, ...(sourceItemOptions.length ? { sourceItems: sourceItemOptions } : {}) }),
    [options, sourceItemOptions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!listUrl) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    try {
      const envelope = await request(listUrl);
      setRows(Array.isArray(envelope.data) ? (envelope.data as Row[]) : []);
      setTotal(envelope.meta?.total ?? 0);
    } catch (reason) {
      setRows([]);
      setError(reason instanceof Error ? reason.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => void load(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if ((!formOpen && !view.apiPath.includes("{parentId}")) || !form?.optionSources?.length) {
      const timer = globalThis.setTimeout(() => setOptions({}), 0);
      return () => globalThis.clearTimeout(timer);
    }
    let active = true;
    void Promise.all(
      form.optionSources.map(async (source) => {
        const envelope = await request(source.path);
        const data = Array.isArray(envelope.data) ? (envelope.data as Row[]) : [];
        return [source.key, data.map((item) => toOption(item, source))] as const;
      }),
    )
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch((reason) => {
        if (active) setFormError(reason instanceof Error ? reason.message : "选项加载失败");
      });
    return () => {
      active = false;
    };
  }, [form, formOpen, view.apiPath]);

  async function loadSourceItems(fieldKey: string, id: string) {
    const detailPath = sourceDetailPath(view, fieldKey, id);
    if (!detailPath) return;
    setSourceLoading(true);
    setFormError(null);
    try {
      const envelope = await request(detailPath);
      setSourceRows(
        envelope.data && typeof envelope.data === "object" ? [envelope.data as Row] : [],
      );
    } catch (reason) {
      setSourceRows([]);
      setFormError(reason instanceof Error ? reason.message : "来源明细加载失败");
    } finally {
      setSourceLoading(false);
    }
  }

  function onFieldChange(field: FieldDefinition, event: ChangeEvent<HTMLSelectElement>) {
    if (form?.sourceItems?.dependsOn === field.key) {
      void loadSourceItems(field.key, event.target.value);
    }
  }

  function openCreate() {
    setFormError(null);
    setSourceRows([]);
    setFormOpen(true);
  }

  function buildPayload(formData: FormData): { path: string; payload: Record<string, unknown> } {
    if (!form || !view.createApiPath) throw new Error("当前视图不支持新增");
    const payload: Record<string, unknown> = {};
    let parentId = fieldInputValue(formData.get("parentId"));
    for (const field of form.fields) {
      const value = fieldValue(field, formData.get(field.key));
      if (field.key === "parentId") {
        parentId = String(value ?? "");
      } else if (value !== undefined) {
        payload[field.key] = value;
      }
    }
    if (view.sourceType && view.id.includes("inspection")) payload.sourceType = view.sourceType;
    if (user?.id && view.id.includes("inspection")) payload.inspectorId = user.id;

    if (form.itemFields?.length) {
      const item: Record<string, unknown> = {};
      for (const field of form.itemFields) {
        if (field.derived) continue;
        const value = fieldValue(field, formData.get(`item.${field.key}`));
        if (value !== undefined) item[field.key] = value;
      }
      if (form.sourceItems) {
        const selectedSourceItemKey = form.itemFields.find(
          (field) => field.optionKey === "sourceItems",
        )?.key;
        const selectedSourceItemId = selectedSourceItemKey
          ? fieldInputValue(formData.get(`item.${selectedSourceItemKey}`))
          : undefined;
        const sourceItem = sourceItemOptions.find(
          (option) => option.value === selectedSourceItemId,
        )?.raw;
        if (sourceItem && form.sourceItems.inject)
          Object.assign(item, form.sourceItems.inject(sourceItem));
      }
      payload.items = [item];
    }

    const path = view.createApiPath.replace("{parentId}", encodeURIComponent(parentId ?? ""));
    if (path.includes("{parentId}") || !path) throw new Error("请选择所属正式单据");
    return { path, payload };
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setError(null);
    try {
      const { path, payload } = buildPayload(new FormData(event.currentTarget));
      await request(path, {
        body: JSON.stringify(payload),
        headers: { "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      toast.success(`${view.label}保存成功`);
      setFormOpen(false);
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "保存失败");
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
      setTimeline(Array.isArray(history?.data) ? (history.data as Row[]) : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "详情加载失败");
    }
  }

  async function runAction(action: WorkflowAction) {
    if (!selected) return;
    const reason = action.requiresReason
      ? globalThis.prompt(`请输入${action.label}原因`)?.trim()
      : undefined;
    if (action.requiresReason && !reason) return;
    const versionNo = selected.versionNo;
    if (versionNo === undefined || versionNo === null) {
      setError("当前单据缺少版本号，无法执行状态操作");
      return;
    }
    if (!globalThis.confirm(`确认执行：${action.label}？`)) return;
    try {
      await request(
        `${view.detailPath.replace("/{id}", "")}/${encodeURIComponent(selected.id)}/${action.action}`,
        {
          body: JSON.stringify({ versionNo, ...(reason ? { reason } : {}) }),
          headers: { "Idempotency-Key": crypto.randomUUID() },
          method: "POST",
        },
      );
      toast.success(`${action.label}成功`);
      await openDetail(selected);
      await load();
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : `${action.label}失败`);
    }
  }

  const parentField = form?.fields.find((field) => field.key === "parentId");

  return (
    <div className="flex flex-col gap-4" data-testid="workflow-workbench">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {view.apiPath.includes("{parentId}") && parentField ? (
            <select
              aria-label={`${parentField.label}筛选`}
              className="h-9 min-w-64 rounded-md border bg-background px-3 text-sm"
              value={parentFilter}
              onChange={(event) => {
                setParentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">请选择{parentField.label}</option>
              {(options[parentField.optionKey ?? ""] ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <SearchBar
              aria-label={`搜索${view.label}`}
              placeholder="搜索单号或关键字"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
            />
          )}
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
            {STATUS_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          {view.createApiPath && view.createPermission && form ? (
            <PermissionWrapper permission={view.createPermission}>
              <Button className="ml-auto" onClick={openCreate}>
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
                  <td className="px-4 py-3 font-medium">{rowTitle(row)}</td>
                  <td className="px-4 py-3">{rowDate(row)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">{rowStatus(row)}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">{rowQuantity(row)}</td>
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
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
      />

      {selected ? (
        <div className={WORKFLOW_SURFACE_CLASSES.drawerOverlay} role="dialog" aria-modal="true">
          <div className={WORKFLOW_SURFACE_CLASSES.drawerContent}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{view.label}详情</h2>
                <p className="text-sm text-muted-foreground">业务字段、状态操作与正式时间线。</p>
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
            {actions.length ? (
              <Card className={WORKFLOW_SURFACE_CLASSES.sectionCard}>
                <h3 className="text-sm font-semibold">状态操作</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <PermissionWrapper permission={action.permission} key={action.action}>
                      <Button variant="secondary" onClick={() => void runAction(action)}>
                        {action.label}
                      </Button>
                    </PermissionWrapper>
                  ))}
                </div>
              </Card>
            ) : null}
            <Card className={WORKFLOW_SURFACE_CLASSES.detailCard}>
              <h3 className="text-sm font-semibold">基础信息</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {detailFields(selected).map(([key, value]) => (
                  <div className={WORKFLOW_SURFACE_CLASSES.fieldPanel} key={key}>
                    <dt className="text-xs text-muted-foreground">{BASIC_FIELDS[key] ?? key}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{display(value)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            {view.historyPath ? (
              <Card className={WORKFLOW_SURFACE_CLASSES.historyCard}>
                <h3 className="text-sm font-semibold">状态历史</h3>
                {timeline.length ? (
                  <ol className="mt-3 space-y-2 border-l pl-4 text-sm">
                    {timeline.map((item) => (
                      <li key={item.id ?? `${item.status}-${item.createdAt}`}>
                        {display(item.fromStatus)} → {display(item.toStatus ?? item.status)}
                        {item.reason ? `：${display(item.reason)}` : ""}
                      </li>
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

      {formOpen && form ? (
        <div className={WORKFLOW_SURFACE_CLASSES.dialogOverlay} role="dialog" aria-modal="true">
          <form className={WORKFLOW_SURFACE_CLASSES.dialogContent} onSubmit={create}>
            <div className={WORKFLOW_SURFACE_CLASSES.dialogHeader}>
              <div>
                <h2 className="text-lg font-semibold">新增{view.label}</h2>
                <p className="text-sm text-muted-foreground">
                  使用中文业务表单提交，不需要填写 UUID、JSON 或英文状态码。
                </p>
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
            <div className={WORKFLOW_SURFACE_CLASSES.dialogBody}>
              {formError ? (
                <p className="rounded-md border border-danger/30 !bg-white p-3 text-sm text-danger dark:!bg-slate-950">
                  {formError}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {form.fields.map((field) => (
                  <label className="block text-sm font-medium" key={field.key}>
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                    {field.type === "select" ? (
                      <select
                        className={WORKFLOW_SURFACE_CLASSES.formControl}
                        defaultValue={form.defaults?.[field.key] ?? ""}
                        name={field.key}
                        onChange={(event) => onFieldChange(field, event)}
                        required={field.required}
                      >
                        <option value="">请选择{field.label}</option>
                        {(field.values ?? allOptions[field.optionKey ?? ""] ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        className={WORKFLOW_SURFACE_CLASSES.textareaControl}
                        defaultValue={form.defaults?.[field.key] ?? ""}
                        name={field.key}
                        required={field.required}
                      />
                    ) : (
                      <input
                        className={WORKFLOW_SURFACE_CLASSES.formControl}
                        defaultValue={form.defaults?.[field.key] ?? ""}
                        name={field.key}
                        placeholder={field.placeholder}
                        required={field.required}
                        type={field.type ?? "text"}
                      />
                    )}
                  </label>
                ))}
              </div>
              {form.itemFields?.length ? (
                <Card className={WORKFLOW_SURFACE_CLASSES.sectionCard}>
                  <h3 className="text-sm font-semibold">明细行</h3>
                  {sourceLoading ? (
                    <p className="mt-3 text-sm text-muted-foreground">正在加载来源明细…</p>
                  ) : null}
                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                    {form.itemFields
                      .filter((field) => !field.derived)
                      .map((field) => (
                        <label className="block text-sm font-medium" key={field.key}>
                          {field.label}
                          {field.required ? <span className="text-danger"> *</span> : null}
                          {field.type === "select" ? (
                            <select
                              className={WORKFLOW_SURFACE_CLASSES.formControl}
                              name={`item.${field.key}`}
                              required={field.required}
                            >
                              <option value="">请选择{field.label}</option>
                              {(field.values ?? allOptions[field.optionKey ?? ""] ?? []).map(
                                (option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ),
                              )}
                            </select>
                          ) : (
                            <input
                              className={WORKFLOW_SURFACE_CLASSES.formControl}
                              name={`item.${field.key}`}
                              required={field.required}
                              type={field.type ?? "text"}
                            />
                          )}
                        </label>
                      ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    当前批次先提供单行明细录入；多行明细可重复创建或后续进入增强批次。
                  </p>
                </Card>
              ) : null}
            </div>
            <div className={WORKFLOW_SURFACE_CLASSES.dialogFooter}>
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
