import {
  ATTACHMENT_OBJECT_TYPES,
  type AttachmentObjectReader,
  type AttachmentObjectSnapshot,
  type AttachmentObjectType,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

type JsonRecord = Record<string, unknown>;
type DynamicDelegate = Readonly<{
  findFirst(args: JsonRecord): Promise<JsonRecord | null>;
  findUnique(args: JsonRecord): Promise<JsonRecord | null>;
}>;
type DynamicClient = Record<string, DynamicDelegate>;

type ParentScope = Readonly<{
  foreignKey: string;
  manufacturerFields?: readonly string[];
  model: string;
  relatedUserFields?: readonly string[];
  storeFields?: readonly string[];
  warehouseFields?: readonly string[];
}>;

type ObjectMapping = Readonly<{
  alwaysProtected?: boolean;
  itemModel?: string;
  itemParentField?: string;
  manufacturerFields?: readonly string[];
  model: string;
  parentScope?: ParentScope;
  protectionFields?: readonly string[];
  relatedUserFields?: readonly string[];
  stateFields?: readonly string[];
  storeFields?: readonly string[];
  warehouseFields?: readonly string[];
}>;

const commonProtectionFields = [
  "submitted_at",
  "approved_at",
  "completed_at",
  "started_at",
  "adjusted_at",
  "inbound_completed_at",
  "outbound_completed_at",
  "shipped_at",
  "received_at",
] as const;
const commonRelatedUsers = ["created_by", "submitted_by", "approved_by", "cancelled_by"] as const;
const productionParent: ParentScope = {
  foreignKey: "production_order_id",
  manufacturerFields: ["manufacturer_id"],
  model: "production_orders",
  relatedUserFields: commonRelatedUsers,
};

const OBJECT_MAPPINGS: Readonly<Record<AttachmentObjectType, ObjectMapping>> = {
  purchase_order: {
    itemModel: "purchase_order_items",
    itemParentField: "purchase_order_id",
    model: "purchase_orders",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
  },
  purchase_payment: {
    alwaysProtected: true,
    model: "purchase_payments",
    relatedUserFields: ["created_by"],
    stateFields: ["payment_status"],
  },
  purchase_return: {
    itemModel: "purchase_return_items",
    itemParentField: "purchase_return_id",
    model: "purchase_returns",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["return_warehouse_id"],
  },
  production_order: {
    itemModel: "production_order_items",
    itemParentField: "production_order_id",
    manufacturerFields: ["manufacturer_id"],
    model: "production_orders",
    protectionFields: [...commonProtectionFields, "actual_completion_date"],
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
  },
  production_progress_record: {
    alwaysProtected: true,
    model: "production_progress_records",
    parentScope: productionParent,
    relatedUserFields: ["created_by"],
    stateFields: ["progress_stage"],
  },
  production_completion_record: {
    alwaysProtected: true,
    itemModel: "production_completion_record_items",
    itemParentField: "production_completion_record_id",
    model: "production_completion_records",
    parentScope: productionParent,
    relatedUserFields: ["created_by"],
    stateFields: ["completion_status"],
    warehouseFields: ["warehouse_id"],
  },
  production_payment: {
    alwaysProtected: true,
    manufacturerFields: ["manufacturer_id"],
    model: "production_payments",
    parentScope: productionParent,
    relatedUserFields: ["created_by"],
    stateFields: ["payment_status"],
  },
  inspection_order: {
    itemModel: "inspection_order_items",
    itemParentField: "inspection_order_id",
    model: "inspection_orders",
    parentScope: productionParent,
    protectionFields: commonProtectionFields,
    relatedUserFields: [...commonRelatedUsers, "inspector_id"],
    stateFields: ["status", "approval_status", "inspection_result"],
    warehouseFields: ["inspection_warehouse_id"],
  },
  inventory_adjustment: {
    itemModel: "inventory_adjustment_items",
    itemParentField: "inventory_adjustment_id",
    model: "inventory_adjustments",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["warehouse_id"],
  },
  stock_count: {
    itemModel: "stock_count_items",
    itemParentField: "stock_count_id",
    model: "stock_counts",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["warehouse_id"],
  },
  inbound_order: {
    itemModel: "inbound_order_items",
    itemParentField: "inbound_order_id",
    manufacturerFields: ["manufacturer_id"],
    model: "inbound_orders",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["warehouse_id"],
  },
  outbound_order: {
    itemModel: "outbound_order_items",
    itemParentField: "outbound_order_id",
    model: "outbound_orders",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    storeFields: ["store_id"],
    warehouseFields: ["warehouse_id"],
  },
  sales_return: {
    itemModel: "sales_return_items",
    itemParentField: "sales_return_id",
    model: "sales_returns",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    storeFields: ["store_id"],
    warehouseFields: ["return_warehouse_id"],
  },
  damage_report: {
    itemModel: "damage_report_items",
    itemParentField: "damage_report_id",
    model: "damage_reports",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["warehouse_id"],
  },
  transfer_order: {
    itemModel: "transfer_order_items",
    itemParentField: "transfer_order_id",
    model: "transfer_orders",
    protectionFields: commonProtectionFields,
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status"],
    warehouseFields: ["source_warehouse_id", "transit_warehouse_id", "destination_warehouse_id"],
  },
  cross_border_shipment: {
    itemModel: "cross_border_shipment_items",
    itemParentField: "cross_border_shipment_id",
    model: "cross_border_shipments",
    parentScope: productionParent,
    protectionFields: [...commonProtectionFields, "actual_arrival_date"],
    relatedUserFields: commonRelatedUsers,
    stateFields: ["status", "approval_status", "shipment_status"],
    warehouseFields: ["source_warehouse_id", "transit_warehouse_id", "destination_warehouse_id"],
  },
  import_task: {
    alwaysProtected: true,
    itemModel: "import_task_items",
    itemParentField: "import_task_id",
    model: "import_tasks",
    relatedUserFields: ["created_by"],
    stateFields: ["status"],
    storeFields: ["store_id"],
    warehouseFields: ["warehouse_id"],
  },
};

function strings(row: JsonRecord, fields: readonly string[] = []): string[] {
  return fields.flatMap((field) => (typeof row[field] === "string" ? [row[field] as string] : []));
}

function firstString(row: JsonRecord, fields: readonly string[] = []): string | null {
  return strings(row, fields)[0] ?? null;
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

async function parentRow(
  client: DynamicClient,
  row: JsonRecord,
  parent: ParentScope | undefined,
): Promise<JsonRecord | null> {
  if (!parent) return null;
  const id = row[parent.foreignKey];
  if (typeof id !== "string") return null;
  return client[parent.model]!.findUnique({ where: { id } });
}

export class PrismaAttachmentObjectReader implements AttachmentObjectReader {
  readonly #client: DynamicClient;

  constructor(client: PrismaClient = getPrismaClient()) {
    this.#client = client as unknown as DynamicClient;
  }

  async load(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string,
  ): Promise<AttachmentObjectSnapshot | null> {
    const mapping = OBJECT_MAPPINGS[objectType];
    const row = await this.#client[mapping.model]!.findUnique({ where: { id: objectId } });
    if (!row) return null;

    let itemExists = true;
    if (objectItemId) {
      itemExists = Boolean(
        mapping.itemModel && mapping.itemParentField
          ? await this.#client[mapping.itemModel]!.findFirst({
              where: { [mapping.itemParentField]: objectId, id: objectItemId },
            })
          : false,
      );
    }

    const parent = await parentRow(this.#client, row, mapping.parentScope);
    const parentMapping = mapping.parentScope;
    const relatedUserIds = unique([
      ...strings(row, mapping.relatedUserFields),
      ...(parent ? strings(parent, parentMapping?.relatedUserFields) : []),
    ]);

    return Object.freeze({
      createdBy: String(row.created_by),
      id: String(row.id),
      itemExists,
      manufacturerIds: unique([
        ...strings(row, mapping.manufacturerFields),
        ...(parent ? strings(parent, parentMapping?.manufacturerFields) : []),
      ]),
      objectType,
      protectionActivated:
        Boolean(mapping.alwaysProtected) ||
        (mapping.protectionFields ?? []).some(
          (field) => row[field] !== null && row[field] !== undefined,
        ),
      relatedUserIds,
      state: firstString(row, mapping.stateFields),
      storeIds: unique([
        ...strings(row, mapping.storeFields),
        ...(parent ? strings(parent, parentMapping?.storeFields) : []),
      ]),
      updatedAt: row.updated_at as Date,
      warehouseIds: unique([
        ...strings(row, mapping.warehouseFields),
        ...(parent ? strings(parent, parentMapping?.warehouseFields) : []),
      ]),
    });
  }
}

export const PRISMA_ATTACHMENT_OBJECT_TYPES = Object.freeze(
  Object.keys(OBJECT_MAPPINGS) as AttachmentObjectType[],
);

if (
  PRISMA_ATTACHMENT_OBJECT_TYPES.length !== ATTACHMENT_OBJECT_TYPES.length ||
  ATTACHMENT_OBJECT_TYPES.some((value) => !PRISMA_ATTACHMENT_OBJECT_TYPES.includes(value))
) {
  throw new Error("Prisma Attachment Object mapping is incomplete");
}
