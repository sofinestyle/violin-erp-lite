import {
  AttachmentDataScopeDeniedError,
  AttachmentNotFoundError,
  AttachmentObjectStateError,
  AttachmentPermissionDeniedError,
  AttachmentProtectedError,
} from "./errors.js";
import {
  ATTACHMENT_OBJECT_TYPES,
  type AttachmentAccessContext,
  type AttachmentCategory,
  type AttachmentObjectReader,
  type AttachmentObjectSnapshot,
  type AttachmentObjectType,
  type AttachmentValidationOperation,
} from "./types.js";

type ObjectDefinition = Readonly<{
  externalWrite: boolean;
  objectType: AttachmentObjectType;
  permissionResource: string;
}>;

const definition = (
  objectType: AttachmentObjectType,
  permissionResource: string,
  externalWrite = true,
): ObjectDefinition => ({ externalWrite, objectType, permissionResource });

export const ATTACHMENT_OBJECT_DEFINITIONS: Readonly<
  Record<AttachmentObjectType, ObjectDefinition>
> = {
  purchase_order: definition("purchase_order", "purchase.order"),
  purchase_payment: definition("purchase_payment", "purchase.payment"),
  purchase_return: definition("purchase_return", "purchase.return"),
  production_order: definition("production_order", "production.order"),
  production_progress_record: definition("production_progress_record", "production.progress"),
  production_completion_record: definition("production_completion_record", "production.completion"),
  production_payment: definition("production_payment", "production.payment"),
  inspection_order: definition("inspection_order", "inspection.order"),
  inventory_adjustment: definition("inventory_adjustment", "inventory.adjustment"),
  stock_count: definition("stock_count", "inventory.stock-count"),
  inbound_order: definition("inbound_order", "inbound.order"),
  outbound_order: definition("outbound_order", "outbound.order"),
  sales_return: definition("sales_return", "outbound.sales-return"),
  damage_report: definition("damage_report", "inventory.damage"),
  transfer_order: definition("transfer_order", "transfer.order"),
  cross_border_shipment: definition("cross_border_shipment", "cross-border.shipment"),
  import_task: definition("import_task", "import.task", false),
  product: definition("product", "master.product"),
};

const READ_ACTION = "read";
const NON_WRITING_ACTIONS = new Set(["export", "read"]);
const READ_OPERATIONS = new Set<AttachmentValidationOperation>(["download", "read"]);

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export class AttachmentObjectRegistry {
  readonly size = ATTACHMENT_OBJECT_TYPES.length;
  readonly #reader: AttachmentObjectReader;

  constructor(reader: AttachmentObjectReader) {
    this.#reader = reader;
  }

  exists(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string,
  ): Promise<boolean> {
    return this.load(objectType, objectId, objectItemId).then(Boolean);
  }

  load(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string,
  ): Promise<AttachmentObjectSnapshot | null> {
    return this.#reader.load(objectType, objectId, objectItemId);
  }

  checkReadPermission(objectType: AttachmentObjectType, access: AttachmentAccessContext): void {
    const resource = this.#definition(objectType).permissionResource;
    if (!access.permissionCodes.some((code) => code === `${resource}.${READ_ACTION}`)) {
      throw new AttachmentPermissionDeniedError();
    }
  }

  checkWritePermission(objectType: AttachmentObjectType, access: AttachmentAccessContext): void {
    const current = this.#definition(objectType);
    if (!current.externalWrite) throw new AttachmentObjectStateError();
    const prefix = `${current.permissionResource}.`;
    const allowed = access.permissionCodes.some((code) => {
      if (!code.startsWith(prefix)) return false;
      return !NON_WRITING_ACTIONS.has(code.slice(prefix.length));
    });
    if (!allowed) throw new AttachmentPermissionDeniedError();
  }

  checkDataScope(object: AttachmentObjectSnapshot, access: AttachmentAccessContext): void {
    if (access.dataScopes.includes("all")) return;
    if (access.dataScopes.includes("self_created") && object.createdBy === access.userId) {
      return;
    }
    if (
      access.dataScopes.includes("business_related") &&
      object.relatedUserIds.includes(access.userId)
    ) {
      return;
    }
    if (
      access.dataScopes.includes("warehouse") &&
      intersects(object.warehouseIds, access.warehouseIds ?? [])
    ) {
      return;
    }
    if (access.dataScopes.includes("store") && intersects(object.storeIds, access.storeIds ?? [])) {
      return;
    }
    if (
      access.dataScopes.includes("manufacturer_derived") &&
      intersects(object.manufacturerIds, access.manufacturerIds ?? [])
    ) {
      return;
    }
    throw new AttachmentDataScopeDeniedError();
  }

  checkObjectState(
    object: AttachmentObjectSnapshot,
    operation: AttachmentValidationOperation,
  ): void {
    if (!object.itemExists) throw new AttachmentNotFoundError();
    if (!READ_OPERATIONS.has(operation) && !this.#definition(object.objectType).externalWrite) {
      throw new AttachmentObjectStateError();
    }
  }

  supportsCategory(
    objectType: AttachmentObjectType,
    category: AttachmentCategory,
    allowObjectType: (category: AttachmentCategory, objectType: AttachmentObjectType) => boolean,
  ): boolean {
    return allowObjectType(category, objectType);
  }

  supportsAttachment(objectType: AttachmentObjectType): boolean {
    return Boolean(ATTACHMENT_OBJECT_DEFINITIONS[objectType]);
  }

  isProtected(object: AttachmentObjectSnapshot, category: AttachmentCategory): boolean {
    if (category === "import_source_file" || category === "import_error_report") return true;
    if (category === "payment_voucher" || category === "production_progress_evidence") return true;
    return object.protectionActivated;
  }

  requireNotProtected(object: AttachmentObjectSnapshot, category: AttachmentCategory): void {
    if (this.isProtected(object, category)) throw new AttachmentProtectedError();
  }

  #definition(objectType: AttachmentObjectType): ObjectDefinition {
    return ATTACHMENT_OBJECT_DEFINITIONS[objectType];
  }
}
