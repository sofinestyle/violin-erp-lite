import { recordAuditEvent, type AuditWriter } from "../audit/audit.js";
import type { AuthenticatedUser, AuthenticationContext } from "../auth/authentication.js";
import { requirePermission } from "../authorization/authorization.js";
import type { PermissionCode } from "../authorization/permissions.js";
import { AppError, ValidationError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

export const WORKFLOW_API_IDS = [
  ...Array.from({ length: 19 }, (_, index) => `PUR-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 29 }, (_, index) => `PRO-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `INS-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 18 }, (_, index) => `INB-${String(index + 1).padStart(3, "0")}`).filter(
    (id) => id !== "INB-005",
  ),
] as const;

export type WorkflowApiId = (typeof WORKFLOW_API_IDS)[number];
export type WorkflowPayload = Readonly<Record<string, unknown>>;

export type WorkflowCommand = Readonly<{
  action: string;
  apiId: WorkflowApiId;
  entityId?: string;
  mutation: boolean;
  parentId?: string;
  payload: WorkflowPayload;
  query: URLSearchParams;
  resource:
    | "inbound"
    | "inspection"
    | "production"
    | "production-completion"
    | "production-payment"
    | "production-progress"
    | "purchase"
    | "purchase-payment";
}>;

export type WorkflowRepository = Readonly<{
  execute: (command: WorkflowCommand, actor: AuthenticatedUser) => Promise<unknown>;
}>;

type Endpoint = Readonly<{
  action: string;
  apiId: WorkflowApiId;
  method: string;
  mutation?: boolean;
  path: RegExp;
  permission: PermissionCode;
  resource: WorkflowCommand["resource"];
}>;

const p = (code: PermissionCode) => code;
const endpoints: readonly Endpoint[] = [
  {
    apiId: "PUR-001",
    method: "GET",
    path: /^purchase-orders$/,
    resource: "purchase",
    action: "list",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-002",
    method: "GET",
    path: /^purchase-orders\/([^/]+)$/,
    resource: "purchase",
    action: "detail",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-003",
    method: "POST",
    path: /^purchase-orders$/,
    resource: "purchase",
    action: "create",
    permission: p("purchase.order.create"),
    mutation: true,
  },
  {
    apiId: "PUR-004",
    method: "PATCH",
    path: /^purchase-orders\/([^/]+)$/,
    resource: "purchase",
    action: "update",
    permission: p("purchase.order.update"),
    mutation: true,
  },
  ...(["submit", "withdraw", "approve", "reject", "unapprove", "cancel", "void"] as const).map(
    (action, index): Endpoint => ({
      action,
      apiId: `PUR-${String(index + 5).padStart(3, "0")}` as WorkflowApiId,
      method: "POST",
      mutation: true,
      path: new RegExp(`^purchase-orders/([^/]+)/${action}$`),
      permission: p(`purchase.order.${action}` as PermissionCode),
      resource: "purchase",
    }),
  ),
  {
    apiId: "PUR-012",
    method: "GET",
    path: /^purchase-orders\/([^/]+)\/progress$/,
    resource: "purchase",
    action: "progress",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-013",
    method: "GET",
    path: /^purchase-orders\/([^/]+)\/inspection-orders$/,
    resource: "purchase",
    action: "inspections",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-014",
    method: "GET",
    path: /^purchase-orders\/([^/]+)\/inbound-orders$/,
    resource: "purchase",
    action: "inbounds",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-015",
    method: "GET",
    path: /^purchase-orders\/([^/]+)\/status-history$/,
    resource: "purchase",
    action: "history",
    permission: p("purchase.order.read"),
  },
  {
    apiId: "PUR-016",
    method: "POST",
    path: /^purchase-orders\/export$/,
    resource: "purchase",
    action: "export",
    permission: p("purchase.order.export"),
    mutation: true,
  },
  {
    apiId: "PUR-017",
    method: "GET",
    path: /^purchase-orders\/([^/]+)\/payments$/,
    resource: "purchase-payment",
    action: "list",
    permission: p("purchase.payment.read"),
  },
  {
    apiId: "PUR-018",
    method: "GET",
    path: /^purchase-payments\/([^/]+)$/,
    resource: "purchase-payment",
    action: "detail",
    permission: p("purchase.payment.read"),
  },
  {
    apiId: "PUR-019",
    method: "POST",
    path: /^purchase-orders\/([^/]+)\/payments$/,
    resource: "purchase-payment",
    action: "create",
    permission: p("purchase.payment.create"),
    mutation: true,
  },

  {
    apiId: "PRO-001",
    method: "GET",
    path: /^production-orders$/,
    resource: "production",
    action: "list",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-002",
    method: "GET",
    path: /^production-orders\/([^/]+)$/,
    resource: "production",
    action: "detail",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-003",
    method: "POST",
    path: /^production-orders$/,
    resource: "production",
    action: "create",
    permission: p("production.order.create"),
    mutation: true,
  },
  {
    apiId: "PRO-004",
    method: "PATCH",
    path: /^production-orders\/([^/]+)$/,
    resource: "production",
    action: "update",
    permission: p("production.order.update"),
    mutation: true,
  },
  ...(
    ["submit", "withdraw", "approve", "reject", "unapprove", "start", "cancel", "void"] as const
  ).map((action, index): Endpoint => ({
    action,
    apiId: `PRO-${String(index + 5).padStart(3, "0")}` as WorkflowApiId,
    method: "POST",
    mutation: true,
    path: new RegExp(`^production-orders/([^/]+)/${action}$`),
    permission: p(`production.order.${action}` as PermissionCode),
    resource: "production",
  })),
  {
    apiId: "PRO-013",
    method: "GET",
    path: /^production-orders\/([^/]+)\/progress-summary$/,
    resource: "production",
    action: "progress-summary",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-014",
    method: "GET",
    path: /^production-orders\/([^/]+)\/inspection-orders$/,
    resource: "production",
    action: "inspections",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-015",
    method: "GET",
    path: /^production-orders\/([^/]+)\/inbound-orders$/,
    resource: "production",
    action: "inbounds",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-016",
    method: "GET",
    path: /^production-orders\/([^/]+)\/status-history$/,
    resource: "production",
    action: "history",
    permission: p("production.order.read"),
  },
  {
    apiId: "PRO-017",
    method: "POST",
    path: /^production-orders\/export$/,
    resource: "production",
    action: "export",
    permission: p("production.order.export"),
    mutation: true,
  },
  {
    apiId: "PRO-018",
    method: "GET",
    path: /^production-orders\/([^/]+)\/progress-records$/,
    resource: "production-progress",
    action: "list",
    permission: p("production.progress.read"),
  },
  {
    apiId: "PRO-019",
    method: "GET",
    path: /^production-progress-records\/([^/]+)$/,
    resource: "production-progress",
    action: "detail",
    permission: p("production.progress.read"),
  },
  {
    apiId: "PRO-020",
    method: "POST",
    path: /^production-orders\/([^/]+)\/progress-records$/,
    resource: "production-progress",
    action: "create",
    permission: p("production.progress.create"),
    mutation: true,
  },
  {
    apiId: "PRO-021",
    method: "GET",
    path: /^production-orders\/([^/]+)\/completion-records$/,
    resource: "production-completion",
    action: "list",
    permission: p("production.completion.read"),
  },
  {
    apiId: "PRO-022",
    method: "GET",
    path: /^production-completion-records\/([^/]+)$/,
    resource: "production-completion",
    action: "detail",
    permission: p("production.completion.read"),
  },
  {
    apiId: "PRO-023",
    method: "GET",
    path: /^production-orders\/([^/]+)\/payments$/,
    resource: "production-payment",
    action: "list",
    permission: p("production.payment.read"),
  },
  {
    apiId: "PRO-024",
    method: "GET",
    path: /^production-payments\/([^/]+)$/,
    resource: "production-payment",
    action: "detail",
    permission: p("production.payment.read"),
  },
  {
    apiId: "PRO-025",
    method: "POST",
    path: /^production-orders\/([^/]+)\/payments$/,
    resource: "production-payment",
    action: "create",
    permission: p("production.payment.create"),
    mutation: true,
  },
  {
    apiId: "PRO-026",
    method: "POST",
    path: /^production-orders\/([^/]+)\/completion-records$/,
    resource: "production-completion",
    action: "create",
    permission: p("production.completion.create"),
    mutation: true,
  },
  ...(["confirm", "revoke", "void"] as const).map((action, index): Endpoint => ({
    action,
    apiId: `PRO-${String(index + 27).padStart(3, "0")}` as WorkflowApiId,
    method: "POST",
    mutation: true,
    path: new RegExp(`^production-completion-records/([^/]+)/${action}$`),
    permission: p(`production.completion.${action}` as PermissionCode),
    resource: "production-completion",
  })),

  {
    apiId: "INS-001",
    method: "GET",
    path: /^inspection-orders$/,
    resource: "inspection",
    action: "list",
    permission: p("inspection.order.read"),
  },
  {
    apiId: "INS-002",
    method: "GET",
    path: /^inspection-orders\/([^/]+)$/,
    resource: "inspection",
    action: "detail",
    permission: p("inspection.order.read"),
  },
  {
    apiId: "INS-003",
    method: "POST",
    path: /^inspection-orders$/,
    resource: "inspection",
    action: "create",
    permission: p("inspection.order.create"),
    mutation: true,
  },
  {
    apiId: "INS-004",
    method: "PATCH",
    path: /^inspection-orders\/([^/]+)$/,
    resource: "inspection",
    action: "update",
    permission: p("inspection.order.update"),
    mutation: true,
  },
  ...(["submit", "confirm", "revoke", "void"] as const).map((action, index): Endpoint => ({
    action,
    apiId: `INS-${String(index + 5).padStart(3, "0")}` as WorkflowApiId,
    method: "POST",
    mutation: true,
    path: new RegExp(`^inspection-orders/([^/]+)/${action}$`),
    permission: p(`inspection.order.${action}` as PermissionCode),
    resource: "inspection",
  })),
  {
    apiId: "INS-009",
    method: "GET",
    path: /^inspection-orders\/([^/]+)\/status-history$/,
    resource: "inspection",
    action: "history",
    permission: p("inspection.order.read"),
  },
  {
    apiId: "INS-010",
    method: "POST",
    path: /^inspection-orders\/export$/,
    resource: "inspection",
    action: "export",
    permission: p("inspection.order.export"),
    mutation: true,
  },

  {
    apiId: "INB-001",
    method: "GET",
    path: /^inbound-orders$/,
    resource: "inbound",
    action: "list",
    permission: p("inbound.order.read"),
  },
  {
    apiId: "INB-002",
    method: "GET",
    path: /^inbound-orders\/([^/]+)$/,
    resource: "inbound",
    action: "detail",
    permission: p("inbound.order.read"),
  },
  {
    apiId: "INB-003",
    method: "POST",
    path: /^inbound-orders\/purchase$/,
    resource: "inbound",
    action: "create-purchase",
    permission: p("inbound.order.create-purchase"),
    mutation: true,
  },
  {
    apiId: "INB-004",
    method: "POST",
    path: /^inbound-orders\/production$/,
    resource: "inbound",
    action: "create-production",
    permission: p("inbound.order.create-production"),
    mutation: true,
  },
  {
    apiId: "INB-006",
    method: "PATCH",
    path: /^inbound-orders\/([^/]+)$/,
    resource: "inbound",
    action: "update",
    permission: p("inbound.order.update"),
    mutation: true,
  },
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
  ).map((action, index): Endpoint => ({
    action,
    apiId: `INB-${String(index + 7).padStart(3, "0")}` as WorkflowApiId,
    method: "POST",
    mutation: true,
    path: new RegExp(`^inbound-orders/([^/]+)/${action}$`),
    permission: p(`inbound.order.${action}` as PermissionCode),
    resource: "inbound",
  })),
  {
    apiId: "INB-015",
    method: "GET",
    path: /^inbound-orders\/([^/]+)\/status-history$/,
    resource: "inbound",
    action: "history",
    permission: p("inbound.order.read"),
  },
  {
    apiId: "INB-016",
    method: "GET",
    path: /^inbound-orders\/([^/]+)\/inventory-transactions$/,
    resource: "inbound",
    action: "transactions",
    permission: p("inbound.order.read"),
  },
  {
    apiId: "INB-017",
    method: "POST",
    path: /^inbound-orders\/export$/,
    resource: "inbound",
    action: "export",
    permission: p("inbound.order.export"),
    mutation: true,
  },
  {
    apiId: "INB-018",
    method: "GET",
    path: /^inbound-orders\/([^/]+)\/progress$/,
    resource: "inbound",
    action: "progress",
    permission: p("inbound.order.read"),
  },
];

export const WORKFLOW_IMPLEMENTED_API_IDS: readonly WorkflowApiId[] = Object.freeze(
  endpoints.map((endpoint) => endpoint.apiId),
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function matchWorkflowEndpoint(
  method: string,
  segments: readonly string[],
  query: URLSearchParams,
  payload: WorkflowPayload = {},
): { command: WorkflowCommand; permission: PermissionCode } | null {
  const path = segments.join("/");
  for (const endpoint of endpoints) {
    if (endpoint.method !== method) continue;
    const match = endpoint.path.exec(path);
    if (!match) continue;
    const capturedId = match[1];
    if (capturedId && !UUID_PATTERN.test(capturedId)) {
      throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
    }
    const isChildCreateOrList =
      endpoint.resource.endsWith("payment") ||
      endpoint.resource === "production-progress" ||
      (endpoint.resource === "production-completion" &&
        (endpoint.action === "create" || endpoint.action === "list"));
    return {
      command: {
        action: endpoint.action,
        apiId: endpoint.apiId,
        ...(capturedId
          ? isChildCreateOrList
            ? { parentId: capturedId }
            : { entityId: capturedId }
          : {}),
        mutation: endpoint.mutation ?? false,
        payload,
        query,
        resource: endpoint.resource,
      },
      permission: endpoint.permission,
    };
  }
  return null;
}

function required(payload: WorkflowPayload, names: readonly string[]): void {
  const missing = names.filter(
    (name) => payload[name] === undefined || payload[name] === null || payload[name] === "",
  );
  if (missing.length) {
    throw new ValidationError(
      "请求缺少必填字段",
      missing.map((field) => ({ field, message: "必填字段不能为空" })),
    );
  }
}

function validateCommand(command: WorkflowCommand): void {
  const stateActions = [
    "submit",
    "withdraw",
    "approve",
    "reject",
    "unapprove",
    "cancel",
    "void",
    "confirm",
    "revoke",
    "reverse",
    "start",
  ];
  if (stateActions.includes(command.action) && command.resource !== "production-completion") {
    required(command.payload, ["versionNo"]);
  }
  if (["reject", "cancel", "void", "revoke", "reverse"].includes(command.action)) {
    required(command.payload, ["reason"]);
  }
  if (!command.mutation || stateActions.includes(command.action)) return;
  if (command.action === "create" && command.resource === "purchase") {
    required(command.payload, [
      "documentDate",
      "supplierId",
      "expectedDeliveryDate",
      "settlementMethod",
      "items",
    ]);
  } else if (command.action === "create" && command.resource === "production") {
    required(command.payload, [
      "documentDate",
      "manufacturerId",
      "plannedStartDate",
      "expectedCompletionDate",
      "items",
    ]);
    if ("purchaseOrderId" in command.payload) throw new ValidationError("生产单不得引用采购单");
  } else if (command.action === "create" && command.resource === "inspection") {
    required(command.payload, [
      "sourceType",
      "inspectionDate",
      "inspectionWarehouseId",
      "inspectorId",
      "items",
    ]);
    const sourceType = command.payload.sourceType;
    const purchase = typeof command.payload.purchaseOrderId === "string";
    const production = typeof command.payload.productionOrderId === "string";
    if ((sourceType !== "purchase" && sourceType !== "production") || purchase === production) {
      throw new ValidationError("验收单必须且只能关联一个采购或生产来源");
    }
  } else if (command.action.startsWith("create-") && command.resource === "inbound") {
    const source = command.action === "create-purchase" ? "purchaseOrderId" : "productionOrderId";
    required(command.payload, [
      "documentDate",
      source,
      "inspectionOrderId",
      "warehouseId",
      "items",
    ]);
  } else if (command.action === "create" && command.resource.endsWith("payment")) {
    required(command.payload, [
      "paymentDate",
      "paymentAmount",
      "paymentMethod",
      "payeeAccountSnapshot",
    ]);
  } else if (command.action === "create" && command.resource === "production-progress") {
    required(command.payload, [
      "progressDate",
      "progressStage",
      "progressPercentage",
      "completedQuantity",
      "progressDescription",
    ]);
  } else if (command.action === "create" && command.resource === "production-completion") {
    required(command.payload, [
      "completionBatchNo",
      "completionDate",
      "warehouseId",
      "productionOrderVersionNo",
      "items",
    ]);
  }
  if (Array.isArray(command.payload.items) && command.payload.items.length === 0) {
    throw new ValidationError("明细不能为空", [{ field: "items", message: "至少需要一条明细" }]);
  }
}

export class WorkflowService {
  constructor(
    private readonly repository: WorkflowRepository,
    private readonly audit: AuditWriter,
  ) {}

  async execute(
    command: WorkflowCommand,
    permission: PermissionCode,
    authentication: AuthenticationContext,
    context: RequestContext,
  ): Promise<unknown> {
    const authenticated = requirePermission(authentication, permission);
    validateCommand(command);
    const result = await this.repository.execute(command, authenticated.user);
    if (command.mutation) {
      await recordAuditEvent(this.audit, {
        action: command.apiId,
        actorUserId: authenticated.user.userId,
        afterSnapshot: result,
        metadata: { action: command.action },
        moduleCode: command.resource,
        requestId: context.requestId,
        resourceId: command.entityId ?? command.parentId ?? "collection",
        resourceType: command.resource,
        result: "success",
        timestamp: new Date(context.timestamp),
        usernameSnapshot: authenticated.user.username,
      });
    }
    return result;
  }
}
