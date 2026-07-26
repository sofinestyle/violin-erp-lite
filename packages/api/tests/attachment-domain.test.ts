import {
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_OBJECT_DEFINITIONS,
  ATTACHMENT_OBJECT_TYPES,
  AttachmentCategoryMismatchError,
  AttachmentCategoryRegistry,
  AttachmentDataScopeDeniedError,
  AttachmentLifecycle,
  AttachmentNotFoundError,
  AttachmentObjectRegistry,
  AttachmentObjectStateError,
  AttachmentObjectUnsupportedError,
  AttachmentPermissionDeniedError,
  AttachmentProtectedError,
  AttachmentStateConflictError,
  AttachmentValidator,
  type AttachmentAccessContext,
  type AttachmentObjectReader,
  type AttachmentObjectSnapshot,
  type AttachmentObjectType,
  type PermissionCode,
} from "../src";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-07-25T00:00:00.000Z");
const OBJECT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

function snapshot(
  objectType: AttachmentObjectType,
  overrides: Partial<AttachmentObjectSnapshot> = {},
): AttachmentObjectSnapshot {
  return {
    createdBy: USER_ID,
    id: OBJECT_ID,
    itemExists: true,
    manufacturerIds: [],
    objectType,
    protectionActivated: false,
    relatedUserIds: [USER_ID],
    state: "draft",
    storeIds: [],
    updatedAt: NOW,
    warehouseIds: [],
    ...overrides,
  };
}

class MemoryObjectReader implements AttachmentObjectReader {
  readonly #objects: ReadonlyMap<AttachmentObjectType, AttachmentObjectSnapshot>;

  constructor(objects: readonly AttachmentObjectSnapshot[]) {
    this.#objects = new Map(objects.map((value) => [value.objectType, value]));
  }

  async load(
    objectType: AttachmentObjectType,
    objectId: string,
  ): Promise<AttachmentObjectSnapshot | null> {
    const found = this.#objects.get(objectType);
    return found?.id === objectId ? found : null;
  }
}

function access(
  permissionCodes: readonly PermissionCode[],
  overrides: Partial<AttachmentAccessContext> = {},
): AttachmentAccessContext {
  return {
    dataScopes: ["self_created"],
    permissionCodes,
    userId: USER_ID,
    ...overrides,
  };
}

describe("Attachment registries", () => {
  const categories = new AttachmentCategoryRegistry();

  it("freezes exactly 18 Object Types behind one registry including API CR-006 product", () => {
    expect(ATTACHMENT_OBJECT_TYPES).toHaveLength(18);
    expect(ATTACHMENT_OBJECT_TYPES).toContain("product");
    expect(Object.keys(ATTACHMENT_OBJECT_DEFINITIONS)).toEqual([...ATTACHMENT_OBJECT_TYPES]);
    expect(ATTACHMENT_OBJECT_DEFINITIONS.product.permissionResource).toBe("master.product");
    expect(new AttachmentObjectRegistry(new MemoryObjectReader([])).size).toBe(18);
  });

  it("freezes exactly 10 Categories and their approved matrices", () => {
    expect(ATTACHMENT_CATEGORIES).toHaveLength(10);
    expect(categories.size).toBe(10);
    expect(categories.defaultSensitive("payment_voucher")).toBe(true);
    expect(categories.isEvidence("inspection_evidence")).toBe(true);
    expect(categories.allowObjectType("inspection_evidence", "inspection_order")).toBe(true);
    expect(categories.allowObjectType("inspection_evidence", "purchase_order")).toBe(false);
    expect(categories.allowObjectType("general_business_document", "product")).toBe(true);
    expect(categories.allowObjectType("inspection_evidence", "product")).toBe(false);
    expect(categories.allowObjectType("payment_voucher", "product")).toBe(false);
    expect(categories.allowObjectType("import_source_file", "product")).toBe(false);
    expect(categories.canDelete("import_source_file", { hasLinks: false, protected: false })).toBe(
      false,
    );
    expect(
      categories.canDelete("general_business_document", {
        hasLinks: false,
        protected: false,
      }),
    ).toBe(true);
    expect(categories.defaultRetention("cross_border_shipping_evidence")).toContain("永久保留");
  });
});

describe("Attachment lifecycle", () => {
  const lifecycle = new AttachmentLifecycle();

  it("allows every Frozen lifecycle transition", () => {
    expect(lifecycle.nextState("active", "soft_delete")).toBe("soft_deleted");
    expect(lifecycle.nextState("soft_deleted", "begin_physical_delete")).toBe(
      "pending_physical_delete",
    );
    expect(lifecycle.nextState("pending_physical_delete", "physical_delete_succeeded")).toBe(
      "physically_deleted",
    );
    expect(lifecycle.nextState("pending_physical_delete", "physical_delete_failed")).toBe(
      "physical_delete_failed",
    );
    expect(lifecycle.nextState("physical_delete_failed", "retry_physical_delete")).toBe(
      "pending_physical_delete",
    );
  });

  it("rejects non-Frozen transitions and gates link/download", () => {
    expect(lifecycle.canSoftDelete("active")).toBe(true);
    expect(lifecycle.canPhysicalDelete("soft_deleted")).toBe(true);
    expect(lifecycle.canDownload("active")).toBe(true);
    expect(lifecycle.canLink("active")).toBe(true);
    expect(lifecycle.canDownload("soft_deleted")).toBe(false);
    expect(() => lifecycle.nextState("physically_deleted", "soft_delete")).toThrow(
      AttachmentStateConflictError,
    );
  });
});

describe("Attachment validator", () => {
  const objects = new AttachmentObjectRegistry(
    new MemoryObjectReader([
      snapshot("purchase_order"),
      snapshot("production_order"),
      snapshot("inspection_order", {
        protectionActivated: true,
        state: "submitted",
        warehouseIds: ["warehouse-1"],
      }),
      snapshot("import_task"),
      snapshot("product", { state: "violin" }),
    ]),
  );
  const validator = new AttachmentValidator(objects);

  it("validates Object Type, Category, permission and data scope centrally", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "purchase.order.update"]),
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        operation: "link",
      }),
    ).resolves.toMatchObject({
      category: "general_business_document",
      defaultSensitive: false,
      objectType: "purchase_order",
      protected: false,
    });
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "production.order.update"]),
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "production_order",
        operation: "link",
      }),
    ).resolves.toMatchObject({
      category: "general_business_document",
      defaultSensitive: false,
      objectType: "production_order",
      protected: false,
    });
  });

  it("supports Product Attachment only through general_business_document per API v1.6", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "master.product.update"]),
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "product",
        operation: "link",
      }),
    ).resolves.toMatchObject({
      category: "general_business_document",
      objectType: "product",
      protected: false,
    });

    await expect(
      validator.validate({
        access: access(["attachment.file.link", "master.product.update"]),
        attachmentCategory: "payment_voucher",
        objectId: OBJECT_ID,
        objectType: "product",
        operation: "link",
      }),
    ).rejects.toBeInstanceOf(AttachmentCategoryMismatchError);
  });

  it("rejects unsupported Object Types before object loading", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "purchase.order.update"]),
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "arbitrary_object",
        operation: "link",
      }),
    ).rejects.toBeInstanceOf(AttachmentObjectUnsupportedError);
  });

  it("rejects Category mismatch", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "purchase.order.update"]),
        attachmentCategory: "inspection_evidence",
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        operation: "link",
      }),
    ).rejects.toBeInstanceOf(AttachmentCategoryMismatchError);
  });

  it("rejects missing objects and insufficient permission", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.read", "purchase.order.read"]),
        attachmentCategory: "general_business_document",
        objectId: "33333333-3333-4333-8333-333333333333",
        objectType: "purchase_order",
        operation: "read",
      }),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);

    await expect(
      validator.validate({
        access: access(["attachment.file.link", "purchase.order.read"]),
        attachmentCategory: "general_business_document",
        objectId: OBJECT_ID,
        objectType: "purchase_order",
        operation: "link",
      }),
    ).rejects.toBeInstanceOf(AttachmentPermissionDeniedError);
  });

  it("checks data scope and protected object state", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.read", "inspection.order.read"], {
          dataScopes: ["warehouse"],
          userId: "different-user",
          warehouseIds: [],
        }),
        attachmentCategory: "inspection_evidence",
        objectId: OBJECT_ID,
        objectType: "inspection_order",
        operation: "read",
      }),
    ).rejects.toBeInstanceOf(AttachmentDataScopeDeniedError);

    await expect(
      validator.validate({
        access: access(["attachment.file.unlink", "inspection.order.update"], {
          dataScopes: ["warehouse"],
          userId: "different-user",
          warehouseIds: ["warehouse-1"],
        }),
        attachmentCategory: "inspection_evidence",
        objectId: OBJECT_ID,
        objectType: "inspection_order",
        operation: "unlink",
      }),
    ).rejects.toBeInstanceOf(AttachmentProtectedError);
  });

  it("keeps import_task external writes read-only", async () => {
    await expect(
      validator.validate({
        access: access(["attachment.file.link", "import.task.create"]),
        attachmentCategory: "import_source_file",
        objectId: OBJECT_ID,
        objectType: "import_task",
        operation: "link",
      }),
    ).rejects.toBeInstanceOf(AttachmentObjectStateError);
  });
});
