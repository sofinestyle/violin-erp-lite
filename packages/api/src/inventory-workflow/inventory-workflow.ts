import { recordAuditEvent, type AuditWriter } from "../audit/audit.js";
import type { AuthenticatedUser, AuthenticationContext } from "../auth/authentication.js";
import { requirePermission } from "../authorization/authorization.js";
import type { PermissionCode } from "../authorization/permissions.js";
import { AppError, ValidationError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

export const INVENTORY_WORKFLOW_API_IDS = [
  ...Array.from({ length: 26 }, (_, index) => `INV-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 15 }, (_, index) => `TRF-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 17 }, (_, index) => `STC-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 13 }, (_, index) => `DMG-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 17 }, (_, index) => `OUT-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 13 }, (_, index) => `SRT-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 22 }, (_, index) => `CBR-${String(index + 1).padStart(3, "0")}`),
] as const;

export type InventoryWorkflowApiId = (typeof INVENTORY_WORKFLOW_API_IDS)[number];
export type InventoryWorkflowPayload = Readonly<Record<string, unknown>>;
export type InventoryWorkflowResource =
  | "cross-border"
  | "damage"
  | "inventory"
  | "inventory-adjustment"
  | "inventory-alert"
  | "inventory-transaction"
  | "outbound"
  | "overseas-import"
  | "overseas-inventory"
  | "sales-return"
  | "stock-count"
  | "transfer";

export type InventoryWorkflowCommand = Readonly<{
  action: string;
  apiId: InventoryWorkflowApiId;
  entityId?: string;
  mutation: boolean;
  payload: InventoryWorkflowPayload;
  query: URLSearchParams;
  resource: InventoryWorkflowResource;
}>;

export type InventoryWorkflowRepository = Readonly<{
  execute: (
    command: InventoryWorkflowCommand,
    actor: AuthenticatedUser,
    context: RequestContext,
  ) => Promise<unknown>;
}>;

type Endpoint = Readonly<{
  action: string;
  apiId: InventoryWorkflowApiId;
  method: "GET" | "PATCH" | "POST";
  mutation?: boolean;
  path: RegExp;
  permission: PermissionCode;
  resource: InventoryWorkflowResource;
}>;

const p = (permission: PermissionCode) => permission;
const endpoint = (
  apiId: InventoryWorkflowApiId,
  method: Endpoint["method"],
  path: RegExp,
  resource: InventoryWorkflowResource,
  action: string,
  permission: PermissionCode,
  mutation = false,
): Endpoint => ({ action, apiId, method, mutation, path, permission, resource });

const documentEndpoints = (
  prefix: "TRF" | "STC" | "DMG" | "SRT",
  pathName: string,
  resource: InventoryWorkflowResource,
  permissionResource:
    "transfer.order" | "inventory.stock-count" | "inventory.damage" | "outbound.sales-return",
  actions: readonly (string | Readonly<{ action: string; permissionAction: string }>)[],
): readonly Endpoint[] => [
  endpoint(
    `${prefix}-001`,
    "GET",
    new RegExp(`^${pathName}$`),
    resource,
    "list",
    p(`${permissionResource}.read` as PermissionCode),
  ),
  endpoint(
    `${prefix}-002`,
    "GET",
    new RegExp(`^${pathName}/([^/]+)$`),
    resource,
    "detail",
    p(`${permissionResource}.read` as PermissionCode),
  ),
  endpoint(
    `${prefix}-003`,
    "POST",
    new RegExp(`^${pathName}$`),
    resource,
    "create",
    p(`${permissionResource}.create` as PermissionCode),
    true,
  ),
  endpoint(
    `${prefix}-004`,
    "PATCH",
    new RegExp(`^${pathName}/([^/]+)$`),
    resource,
    "update",
    p(`${permissionResource}.update` as PermissionCode),
    true,
  ),
  ...actions.map((definition, index) => {
    const action = typeof definition === "string" ? definition : definition.action;
    const permissionAction =
      typeof definition === "string" ? definition : definition.permissionAction;
    return endpoint(
      `${prefix}-${String(index + 5).padStart(3, "0")}` as InventoryWorkflowApiId,
      "POST",
      new RegExp(`^${pathName}/([^/]+)/${action}$`),
      resource,
      action,
      p(`${permissionResource}.${permissionAction}` as PermissionCode),
      true,
    );
  }),
];

const endpoints: readonly Endpoint[] = [
  endpoint(
    "INV-001",
    "GET",
    /^inventories\/summary$/,
    "inventory",
    "summary",
    p("inventory.stock.read"),
  ),
  endpoint("INV-002", "GET", /^inventories$/, "inventory", "list", p("inventory.stock.read")),
  endpoint(
    "INV-003",
    "GET",
    /^inventories\/([^/]+)$/,
    "inventory",
    "detail",
    p("inventory.stock.read"),
  ),
  endpoint(
    "INV-004",
    "GET",
    /^inventories\/by-warehouse$/,
    "inventory",
    "by-warehouse",
    p("inventory.stock.read"),
  ),
  endpoint(
    "INV-005",
    "GET",
    /^inventories\/manufacturer-warehouses$/,
    "inventory",
    "manufacturer-warehouses",
    p("inventory.stock.read"),
  ),
  endpoint(
    "INV-006",
    "GET",
    /^inventory-transactions$/,
    "inventory-transaction",
    "list",
    p("inventory.transaction.read"),
  ),
  endpoint(
    "INV-007",
    "GET",
    /^inventory-transactions\/([^/]+)$/,
    "inventory-transaction",
    "detail",
    p("inventory.transaction.read"),
  ),
  endpoint(
    "INV-008",
    "GET",
    /^inventory-alerts$/,
    "inventory-alert",
    "list",
    p("inventory.alert.read"),
  ),
  endpoint(
    "INV-009",
    "GET",
    /^inventory-alerts\/([^/]+)$/,
    "inventory-alert",
    "detail",
    p("inventory.alert.read"),
  ),
  ...(["view", "handle", "close"] as const).map((action, index) =>
    endpoint(
      `INV-${String(index + 10).padStart(3, "0")}` as InventoryWorkflowApiId,
      "POST",
      new RegExp(`^inventory-alerts/([^/]+)/${action}$`),
      "inventory-alert",
      action,
      p(`inventory.alert.${action}`),
      true,
    ),
  ),
  endpoint(
    "INV-013",
    "GET",
    /^inventory-adjustments$/,
    "inventory-adjustment",
    "list",
    p("inventory.adjustment.read"),
  ),
  endpoint(
    "INV-014",
    "GET",
    /^inventory-adjustments\/([^/]+)$/,
    "inventory-adjustment",
    "detail",
    p("inventory.adjustment.read"),
  ),
  endpoint(
    "INV-015",
    "POST",
    /^inventory-adjustments$/,
    "inventory-adjustment",
    "create",
    p("inventory.adjustment.create"),
    true,
  ),
  endpoint(
    "INV-016",
    "PATCH",
    /^inventory-adjustments\/([^/]+)$/,
    "inventory-adjustment",
    "update",
    p("inventory.adjustment.update"),
    true,
  ),
  ...(
    ["submit", "withdraw", "approve", "reject", "unapprove", "cancel", "void", "execute"] as const
  ).map((action, index) =>
    endpoint(
      `INV-${String(index + 17).padStart(3, "0")}` as InventoryWorkflowApiId,
      "POST",
      new RegExp(`^inventory-adjustments/([^/]+)/${action}$`),
      "inventory-adjustment",
      action,
      p(`inventory.adjustment.${action}`),
      true,
    ),
  ),
  endpoint(
    "INV-025",
    "GET",
    /^inventory-adjustments\/([^/]+)\/status-history$/,
    "inventory-adjustment",
    "history",
    p("inventory.adjustment.read"),
  ),
  endpoint(
    "INV-026",
    "POST",
    /^inventory-exports$/,
    "inventory",
    "export",
    p("inventory.adjustment.export"),
    true,
  ),

  ...documentEndpoints("TRF", "transfer-orders", "transfer", "transfer.order", [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "unapprove",
    "cancel",
    "ship",
    "receive",
  ]),
  endpoint(
    "TRF-013",
    "GET",
    /^transfer-orders\/([^/]+)\/status-history$/,
    "transfer",
    "history",
    p("transfer.order.read"),
  ),
  endpoint(
    "TRF-014",
    "GET",
    /^transfer-orders\/([^/]+)\/inventory-transactions$/,
    "transfer",
    "transactions",
    p("transfer.order.read"),
  ),
  endpoint(
    "TRF-015",
    "POST",
    /^transfer-orders\/export$/,
    "transfer",
    "export",
    p("transfer.order.export"),
    true,
  ),

  ...documentEndpoints("STC", "stock-counts", "stock-count", "inventory.stock-count", [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "start",
    { action: "initial-results", permissionAction: "initial-count" },
    { action: "recount-results", permissionAction: "recount" },
    "complete",
    "cancel",
    "void",
  ]),
  endpoint(
    "STC-015",
    "GET",
    /^stock-counts\/([^/]+)\/differences$/,
    "stock-count",
    "differences",
    p("inventory.stock-count.read"),
  ),
  endpoint(
    "STC-016",
    "GET",
    /^stock-counts\/([^/]+)\/status-history$/,
    "stock-count",
    "history",
    p("inventory.stock-count.read"),
  ),
  endpoint(
    "STC-017",
    "POST",
    /^stock-counts\/export$/,
    "stock-count",
    "export",
    p("inventory.stock-count.export"),
    true,
  ),

  ...documentEndpoints("DMG", "damage-reports", "damage", "inventory.damage", [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "cancel",
    "confirm-outbound",
  ]),
  endpoint(
    "DMG-011",
    "POST",
    /^damage-reports\/stock-validation$/,
    "damage",
    "stock-validation",
    p("inventory.damage.validate"),
    true,
  ),
  endpoint(
    "DMG-012",
    "GET",
    /^damage-reports\/([^/]+)\/status-history$/,
    "damage",
    "history",
    p("inventory.damage.read"),
  ),
  endpoint(
    "DMG-013",
    "POST",
    /^damage-reports\/export$/,
    "damage",
    "export",
    p("inventory.damage.export"),
    true,
  ),

  endpoint("OUT-001", "GET", /^outbound-orders$/, "outbound", "list", p("outbound.order.read")),
  endpoint(
    "OUT-002",
    "GET",
    /^outbound-orders\/([^/]+)$/,
    "outbound",
    "detail",
    p("outbound.order.read"),
  ),
  endpoint(
    "OUT-003",
    "POST",
    /^outbound-orders\/domestic-sales$/,
    "outbound",
    "create-domestic-sales",
    p("outbound.order.create-domestic-sales"),
    true,
  ),
  endpoint(
    "OUT-004",
    "POST",
    /^outbound-orders\/other$/,
    "outbound",
    "create-other",
    p("outbound.order.create-other"),
    true,
  ),
  endpoint(
    "OUT-005",
    "PATCH",
    /^outbound-orders\/([^/]+)$/,
    "outbound",
    "update",
    p("outbound.order.update"),
    true,
  ),
  ...(
    [
      "submit",
      "withdraw",
      "approve",
      "reject",
      "unapprove",
      "cancel",
      "confirm",
      "reverse",
    ] as const
  ).map((action, index) =>
    endpoint(
      `OUT-${String(index + 6).padStart(3, "0")}` as InventoryWorkflowApiId,
      "POST",
      new RegExp(`^outbound-orders/([^/]+)/${action}$`),
      "outbound",
      action,
      p(`outbound.order.${action}`),
      true,
    ),
  ),
  endpoint(
    "OUT-014",
    "GET",
    /^outbound-orders\/([^/]+)\/status-history$/,
    "outbound",
    "history",
    p("outbound.order.read"),
  ),
  endpoint(
    "OUT-015",
    "GET",
    /^outbound-orders\/([^/]+)\/inventory-transactions$/,
    "outbound",
    "transactions",
    p("outbound.order.read"),
  ),
  endpoint(
    "OUT-016",
    "POST",
    /^outbound-orders\/export$/,
    "outbound",
    "export",
    p("outbound.order.export"),
    true,
  ),
  endpoint(
    "OUT-017",
    "POST",
    /^purchase-returns\/([^/]+)\/confirm-outbound$/,
    "outbound",
    "confirm-purchase-return",
    p("purchase.return.confirm-outbound"),
    true,
  ),

  ...documentEndpoints("SRT", "sales-returns", "sales-return", "outbound.sales-return", [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "cancel",
    "confirm-inbound",
  ]),
  endpoint(
    "SRT-011",
    "GET",
    /^sales-return-eligible-items$/,
    "sales-return",
    "eligible-items",
    p("outbound.sales-return.read"),
  ),
  endpoint(
    "SRT-012",
    "GET",
    /^sales-returns\/([^/]+)\/status-history$/,
    "sales-return",
    "history",
    p("outbound.sales-return.read"),
  ),
  endpoint(
    "SRT-013",
    "POST",
    /^sales-returns\/export$/,
    "sales-return",
    "export",
    p("outbound.sales-return.export"),
    true,
  ),

  endpoint(
    "CBR-001",
    "GET",
    /^cross-border-shipments$/,
    "cross-border",
    "list",
    p("cross-border.shipment.read"),
  ),
  endpoint(
    "CBR-002",
    "GET",
    /^cross-border-shipments\/([^/]+)$/,
    "cross-border",
    "detail",
    p("cross-border.shipment.read"),
  ),
  endpoint(
    "CBR-003",
    "POST",
    /^cross-border-shipments$/,
    "cross-border",
    "create",
    p("cross-border.shipment.create"),
    true,
  ),
  endpoint(
    "CBR-004",
    "PATCH",
    /^cross-border-shipments\/([^/]+)$/,
    "cross-border",
    "update",
    p("cross-border.shipment.update"),
    true,
  ),
  ...(
    ["submit", "withdraw", "approve", "reject", "unapprove", "cancel", "void", "dispatch"] as const
  ).map((action, index) =>
    endpoint(
      `CBR-${String(index + 5).padStart(3, "0")}` as InventoryWorkflowApiId,
      "POST",
      new RegExp(`^cross-border-shipments/([^/]+)/${action}$`),
      "cross-border",
      action,
      p(`cross-border.shipment.${action}`),
      true,
    ),
  ),
  endpoint(
    "CBR-013",
    "GET",
    /^cross-border-shipments\/([^/]+)\/status-history$/,
    "cross-border",
    "history",
    p("cross-border.shipment.read"),
  ),
  endpoint(
    "CBR-014",
    "GET",
    /^cross-border-shipments\/([^/]+)\/inventory-transactions$/,
    "cross-border",
    "transactions",
    p("cross-border.shipment.read"),
  ),
  endpoint(
    "CBR-015",
    "POST",
    /^cross-border-shipments\/export$/,
    "cross-border",
    "export",
    p("cross-border.shipment.export"),
    true,
  ),
  endpoint(
    "CBR-016",
    "GET",
    /^overseas-inventories\/summary$/,
    "overseas-inventory",
    "summary",
    p("cross-border.overseas-inventory.read"),
  ),
  endpoint(
    "CBR-017",
    "GET",
    /^overseas-inventories$/,
    "overseas-inventory",
    "list",
    p("cross-border.overseas-inventory.read"),
  ),
  endpoint(
    "CBR-018",
    "GET",
    /^overseas-inventory-imports$/,
    "overseas-import",
    "list",
    p("cross-border.import-result.read"),
  ),
  endpoint(
    "CBR-019",
    "GET",
    /^overseas-inventory-imports\/([^/]+)$/,
    "overseas-import",
    "detail",
    p("cross-border.import-result.read"),
  ),
  endpoint(
    "CBR-020",
    "GET",
    /^overseas-inventory-imports\/([^/]+)\/items$/,
    "overseas-import",
    "items",
    p("cross-border.import-result.read"),
  ),
  endpoint(
    "CBR-021",
    "GET",
    /^cross-border-shipments\/([^/]+)\/import-matches$/,
    "cross-border",
    "import-matches",
    p("cross-border.import-result.read"),
  ),
  endpoint(
    "CBR-022",
    "GET",
    /^overseas-inventories\/([^/]+)\/source-trace$/,
    "overseas-inventory",
    "source-trace",
    p("cross-border.source-trace.read"),
  ),
];

export const INVENTORY_WORKFLOW_IMPLEMENTED_API_IDS = Object.freeze(
  endpoints.map(({ apiId }) => apiId),
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function matchInventoryWorkflowEndpoint(
  method: string,
  segments: readonly string[],
  query: URLSearchParams,
  payload: InventoryWorkflowPayload = {},
): { command: InventoryWorkflowCommand; permission: PermissionCode } | null {
  const path = segments.join("/");
  for (const item of endpoints) {
    if (item.method !== method) continue;
    const match = item.path.exec(path);
    if (!match) continue;
    if (match[1] && !UUID_PATTERN.test(match[1])) {
      throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
    }
    return {
      command: {
        action: item.action,
        apiId: item.apiId,
        ...(match[1] ? { entityId: match[1] } : {}),
        mutation: item.mutation ?? false,
        payload,
        query,
        resource: item.resource,
      },
      permission: item.permission,
    };
  }
  return null;
}

function required(payload: InventoryWorkflowPayload, fields: readonly string[]): void {
  const missing = fields.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === "",
  );
  if (missing.length) {
    throw new ValidationError(
      "请求缺少必填字段",
      missing.map((field) => ({ field, message: "必填字段不能为空" })),
    );
  }
}

export function validateInventoryWorkflowCommand(command: InventoryWorkflowCommand): void {
  const versionActions = [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "unapprove",
    "cancel",
    "void",
    "execute",
    "ship",
    "receive",
    "start",
    "complete",
    "confirm",
    "reverse",
    "confirm-inbound",
    "confirm-outbound",
    "dispatch",
    "initial-results",
    "recount-results",
  ];
  if (versionActions.includes(command.action)) required(command.payload, ["versionNo"]);
  if (["reject", "cancel", "void", "reverse"].includes(command.action)) {
    required(command.payload, ["reason"]);
  }
  if (
    ["create", "create-domestic-sales", "create-other"].includes(command.action) &&
    !["inventory-alert"].includes(command.resource)
  ) {
    if (command.resource === "inventory-adjustment") {
      required(command.payload, [
        "documentDate",
        "warehouseId",
        "adjustmentType",
        "adjustmentReason",
        "items",
      ]);
    } else if (command.resource === "transfer") {
      required(command.payload, [
        "documentDate",
        "sourceWarehouseId",
        "transitWarehouseId",
        "destinationWarehouseId",
        "plannedTransferDate",
        "items",
      ]);
      const warehouses = [
        command.payload.sourceWarehouseId,
        command.payload.transitWarehouseId,
        command.payload.destinationWarehouseId,
      ];
      if (new Set(warehouses).size !== 3) throw new ValidationError("调拨的三个仓库必须互不相同");
    } else if (command.resource === "stock-count") {
      required(command.payload, ["documentDate", "warehouseId", "countDate", "countScope"]);
    } else if (command.resource === "damage") {
      required(command.payload, [
        "documentDate",
        "warehouseId",
        "damageDate",
        "damageReason",
        "dispositionMethod",
        "items",
      ]);
    } else if (command.resource === "outbound") {
      required(command.payload, ["documentDate", "warehouseId", "items"]);
    } else if (command.resource === "sales-return") {
      required(command.payload, [
        "outboundOrderId",
        "storeId",
        "returnWarehouseId",
        "returnDate",
        "returnReason",
        "items",
      ]);
    } else if (command.resource === "cross-border") {
      required(command.payload, [
        "documentDate",
        "sourceWarehouseId",
        "transitWarehouseId",
        "destinationWarehouseId",
        "shipmentBatchNo",
        "carrierName",
        "trackingNo",
        "transportMethod",
        "departureDate",
        "estimatedArrivalDate",
        "destinationCountry",
        "items",
      ]);
      if (
        typeof command.payload.transportMethod !== "string" ||
        command.payload.transportMethod.trim().length > 50
      ) {
        throw new ValidationError("transportMethod 必须是长度不超过 50 的字符串");
      }
    }
  }
  if (Array.isArray(command.payload.items) && command.payload.items.length === 0) {
    throw new ValidationError("明细不能为空", [{ field: "items", message: "至少需要一条明细" }]);
  }
}

export class InventoryWorkflowService {
  constructor(
    private readonly repository: InventoryWorkflowRepository,
    private readonly audit: AuditWriter,
  ) {}

  async execute(
    command: InventoryWorkflowCommand,
    permission: PermissionCode,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<unknown> {
    const authenticated = requirePermission(authentication, permission);
    validateInventoryWorkflowCommand(command);
    const result = await this.repository.execute(command, authenticated.user, context);
    if (command.mutation) {
      await recordAuditEvent(this.audit, {
        action: command.apiId,
        actorUserId: authenticated.user.userId,
        afterSnapshot: result,
        metadata: { action: command.action },
        moduleCode: command.resource,
        requestId: context.requestId,
        resourceId: command.entityId ?? "collection",
        resourceType: command.resource,
        result: "success",
        timestamp: new Date(context.timestamp),
        usernameSnapshot: authenticated.user.username,
      });
    }
    return result;
  }
}
