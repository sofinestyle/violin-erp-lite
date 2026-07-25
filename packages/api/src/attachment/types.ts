import type { DataScopeType, PermissionCode } from "../authorization/permissions.js";

export const ATTACHMENT_OBJECT_TYPES = [
  "purchase_order",
  "purchase_payment",
  "purchase_return",
  "production_order",
  "production_progress_record",
  "production_completion_record",
  "production_payment",
  "inspection_order",
  "inventory_adjustment",
  "stock_count",
  "inbound_order",
  "outbound_order",
  "sales_return",
  "damage_report",
  "transfer_order",
  "cross_border_shipment",
  "import_task",
] as const;

export type AttachmentObjectType = (typeof ATTACHMENT_OBJECT_TYPES)[number];

export const ATTACHMENT_CATEGORIES = [
  "general_business_document",
  "inspection_evidence",
  "inbound_evidence",
  "outbound_evidence",
  "inventory_evidence",
  "import_source_file",
  "import_error_report",
  "payment_voucher",
  "production_progress_evidence",
  "cross_border_shipping_evidence",
] as const;

export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

export const ATTACHMENT_STATUSES = [
  "active",
  "soft_deleted",
  "pending_physical_delete",
  "physical_delete_failed",
  "physically_deleted",
] as const;

export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];

export type AttachmentRecord = Readonly<{
  checksum: string;
  createdAt: Date;
  createdBy: string;
  fileExtension: string;
  fileSize: bigint;
  id: string;
  isSensitive: boolean;
  mimeType: string;
  originalFileName: string;
  status: AttachmentStatus;
  storageReference: string;
  storedFileName: string;
  updatedAt: Date;
  updatedBy: string;
  uploadedAt: Date;
  uploadedBy: string;
}>;

export type AttachmentLinkRecord = Readonly<{
  attachmentCategory: AttachmentCategory;
  attachmentId: string;
  createdAt: Date;
  createdBy: string;
  id: string;
  linkedAt: Date;
  linkedBy: string;
  objectId: string;
  objectItemId: string | null;
  objectType: AttachmentObjectType;
  sortOrder: number;
  updatedAt: Date;
  updatedBy: string;
}>;

export type CreateAttachmentInput = Readonly<{
  checksum: string;
  createdBy: string;
  fileExtension: string;
  fileSize: bigint;
  isSensitive: boolean;
  mimeType: string;
  originalFileName: string;
  storageReference: string;
  storedFileName: string;
  uploadedAt: Date;
  uploadedBy: string;
}>;

export type FindAttachmentsInput = Readonly<{
  ids?: readonly string[];
  skip?: number;
  status?: AttachmentStatus;
  take?: number;
  uploadedBy?: string;
}>;

export type AttachmentStatusMutation = Readonly<{
  expectedStatus: AttachmentStatus;
  expectedUpdatedAt: Date;
  id: string;
  nextStatus: AttachmentStatus;
  now: Date;
  updatedBy: string;
}>;

export type AttachmentRepository = Readonly<{
  create(input: CreateAttachmentInput): Promise<AttachmentRecord>;
  exists(id: string): Promise<boolean>;
  findById(id: string): Promise<AttachmentRecord | null>;
  findMany(input?: FindAttachmentsInput): Promise<readonly AttachmentRecord[]>;
  markPendingPhysicalDelete(input: AttachmentStatusMutation): Promise<AttachmentRecord>;
  markPhysicalDeleteFailed(input: AttachmentStatusMutation): Promise<AttachmentRecord>;
  markPhysicallyDeleted(input: AttachmentStatusMutation): Promise<AttachmentRecord>;
  softDelete(input: AttachmentStatusMutation): Promise<AttachmentRecord>;
  updateStatus(input: AttachmentStatusMutation): Promise<AttachmentRecord>;
}>;

export type CreateAttachmentLinkInput = Readonly<{
  attachmentCategory: AttachmentCategory;
  attachmentId: string;
  createdBy: string;
  linkedAt: Date;
  linkedBy: string;
  objectId: string;
  objectItemId?: string | null;
  objectType: AttachmentObjectType;
  sortOrder: number;
}>;

export type AttachmentLinkRepository = Readonly<{
  countByAttachment(attachmentId: string): Promise<number>;
  create(input: CreateAttachmentLinkInput): Promise<AttachmentLinkRecord>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  listByAttachment(attachmentId: string): Promise<readonly AttachmentLinkRecord[]>;
  listByObject(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string | null,
  ): Promise<readonly AttachmentLinkRecord[]>;
}>;

export type AttachmentAccessContext = Readonly<{
  dataScopes: readonly DataScopeType[];
  manufacturerIds?: readonly string[];
  permissionCodes: readonly PermissionCode[];
  storeIds?: readonly string[];
  userId: string;
  warehouseIds?: readonly string[];
}>;

export type AttachmentObjectSnapshot = Readonly<{
  createdBy: string;
  id: string;
  itemExists: boolean;
  manufacturerIds: readonly string[];
  objectType: AttachmentObjectType;
  protectionActivated: boolean;
  relatedUserIds: readonly string[];
  state: string | null;
  storeIds: readonly string[];
  updatedAt: Date;
  warehouseIds: readonly string[];
}>;

export type AttachmentObjectReader = Readonly<{
  load(
    objectType: AttachmentObjectType,
    objectId: string,
    objectItemId?: string,
  ): Promise<AttachmentObjectSnapshot | null>;
}>;

export type AttachmentValidationOperation = "delete" | "link" | "read" | "unlink";

export type ValidateAttachmentObjectInput = Readonly<{
  access: AttachmentAccessContext;
  attachmentCategory: string;
  objectId: string;
  objectItemId?: string;
  objectType: string;
  operation: AttachmentValidationOperation;
}>;

export type ValidatedAttachmentObject = Readonly<{
  category: AttachmentCategory;
  defaultSensitive: boolean;
  object: AttachmentObjectSnapshot;
  objectType: AttachmentObjectType;
  protected: boolean;
}>;
