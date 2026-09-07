import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  WorkflowService,
  matchWorkflowEndpoint,
  type AuthenticationContext,
} from "@violin-erp/api";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaAuditWriter,
  PrismaWorkflowRepository,
  PrismaAttachmentTransactionRunner,
} from "../src/index";

const url = process.env.PURCHASE_DELETE_INTEGRATION_DATABASE_URL;
describe.skipIf(!url).sequential("CR-006 real Prisma purchase deletion", () => {
  let db: ReturnType<typeof createPrismaClient>;
  let service: WorkflowService;
  let auth: AuthenticationContext;
  let supplierId: string;
  let skuId: string;
  let existing: unknown;
  const ids: string[] = [];
  const tag = `UAT-PODELETE-${randomUUID().slice(0, 8).toUpperCase()}`;
  const context = () => ({ requestId: randomUUID(), timestamp: new Date().toISOString() });
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !["localhost", "127.0.0.1"].includes(target.hostname) ||
      target.pathname !== "/violin_erp_lite"
    )
      throw new Error("Only local UAT database allowed");
    db = createPrismaClient(url!);
    const admin = await db.users.findFirstOrThrow({ where: { username: "dev-admin" } });
    auth = { user: (await createCurrentUserResolver(db)(admin.id))! };
    supplierId = (await db.suppliers.findFirstOrThrow({ where: { is_active: true } })).id;
    skuId = (await db.skus.findFirstOrThrow({ where: { is_active: true } })).id;
    existing = await db.purchase_orders.findMany({ orderBy: { id: "asc" } });
    service = new WorkflowService(new PrismaWorkflowRepository(db), new PrismaAuditWriter(db));
  });
  async function create(status = "draft", remark = tag) {
    const endpoint = matchWorkflowEndpoint("POST", ["purchase-orders"], new URLSearchParams(), {
      documentDate: "2026-09-07",
      supplierId,
      expectedDeliveryDate: "2026-09-08",
      settlementMethod: "prepayment",
      remark,
      items: [{ skuId, quantity: 1, unitPrice: 10, taxRate: 0 }],
    })!;
    const order = (await service.execute(
      endpoint.command,
      endpoint.permission,
      auth,
      context(),
    )) as { id: string };
    ids.push(order.id);
    if (status !== "draft")
      await db.purchase_orders.update({ where: { id: order.id }, data: { status } });
    return order.id;
  }
  async function remove(id: string, actor = auth) {
    const endpoint = matchWorkflowEndpoint(
      "DELETE",
      ["purchase-orders", id],
      new URLSearchParams(),
      {},
    )!;
    return service.execute(endpoint.command, endpoint.permission, actor, context());
  }
  afterAll(async () => {
    try {
      // Retain labelled rejected/rollback fixtures and all audit histories; do not clean existing UAT data.
      expect(
        await db.purchase_orders.findMany({
          where: { id: { notIn: ids } },
          orderBy: { id: "asc" },
        }),
      ).toEqual(existing);
    } finally {
      await db.$disconnect();
    }
  });
  it("deletes unused draft, cascades items and commits real audit", async () => {
    const id = await create();
    expect(await db.purchase_order_items.count({ where: { purchase_order_id: id } })).toBe(1);
    expect(await remove(id)).toEqual({ id, deleted: true });
    expect(await db.purchase_order_items.count({ where: { purchase_order_id: id } })).toBe(0);
    expect(await db.audit_logs.count({ where: { object_id: id, action_code: "PUR-030" } })).toBe(1);
    await expect(remove(id)).rejects.toMatchObject({ httpStatus: 404 });
    expect(await db.audit_logs.count({ where: { object_id: id, action_code: "PUR-030" } })).toBe(1);
  });
  it("blocks payment references even for cancelled UAT", async () => {
    const id = await create("cancelled");
    await db.purchase_payments.create({
      data: {
        payment_no: `${tag}-${randomUUID().slice(0, 8)}`,
        purchase_order_id: id,
        supplier_id: supplierId,
        payment_date: new Date(),
        currency_code: "CNY",
        payment_amount: 1,
        payment_method: "bank_transfer",
        payee_account_snapshot: tag,
        payment_status: "cancelled",
        attachment_required: false,
        remark: tag,
        created_by: auth.user.userId,
        updated_by: auth.user.userId,
      },
    });
    await expect(remove(id)).rejects.toThrow("后续业务记录");
    await db.purchase_orders.update({ where: { id }, data: { status: "draft" } });
    await expect(remove(id)).rejects.toThrow("后续业务记录");
    expect(await db.audit_logs.count({ where: { object_id: id, action_code: "PUR-030" } })).toBe(0);
  });
  it("blocks ordinary user cancelled deletion despite cancel permission", async () => {
    const id = await create("cancelled");
    await expect(
      remove(id, { user: { ...auth.user, roleCodes: ["purchaser"] } }),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });
  it("blocks administrator cancelled non-test order", async () => {
    // Test ownership is tracked by exact ID, but remark intentionally lacks the policy prefix.
    const id = await create("cancelled", `非前缀 ${tag}`);
    await expect(remove(id)).rejects.toThrow("当前状态");
  });
  it("allows administrator unused UAT cancelled order", async () => {
    expect(await remove(await create("cancelled"))).toMatchObject({ deleted: true });
  });
  it("serializes duplicate deletes and commits exactly one success audit", async () => {
    const id = await create();
    const results = await Promise.allSettled([remove(id), remove(id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ httpStatus: 404 });
    expect(await db.audit_logs.count({ where: { object_id: id, action_code: "PUR-030" } })).toBe(1);
  });
  it("rejects a stale attachment link after purchase deletion inside the real transaction", async () => {
    const id = await create();
    await remove(id);
    await expect(
      new PrismaAttachmentTransactionRunner(db).run(async ({ links }) =>
        links.create({
          attachmentCategory: "general_business_document",
          attachmentId: randomUUID(),
          createdBy: auth.user.userId,
          linkedBy: auth.user.userId,
          linkedAt: new Date(),
          objectId: id,
          objectType: "purchase_order",
          sortOrder: 0,
        }),
      ),
    ).rejects.toMatchObject({ httpStatus: 404, message: "采购订单已不存在，无法关联附件" });
    expect(await db.attachment_links.count({ where: { object_id: id } })).toBe(0);
  });
  it.each(["approved", "completed", "pending_approval", "rejected"])(
    "blocks %s",
    async (status) => {
      await expect(remove(await create(status))).rejects.toThrow("当前状态");
    },
  );
  it("rolls back parent, children and success audit on real writer failure", async () => {
    const id = await create();
    const before = await db.purchase_orders.findUnique({
      where: { id },
      include: { purchase_order_items: true },
    });
    const write = PrismaAuditWriter.prototype.write;
    const spy = vi.spyOn(PrismaAuditWriter.prototype, "write").mockImplementationOnce(function (
      this: PrismaAuditWriter,
      event,
    ) {
      return write.call(this, { ...event, resourceId: "invalid-uuid" });
    });
    try {
      await expect(remove(id)).rejects.toMatchObject({ httpStatus: 503 });
    } finally {
      spy.mockRestore();
    }
    expect(
      await db.purchase_orders.findUnique({
        where: { id },
        include: { purchase_order_items: true },
      }),
    ).toEqual(before);
    expect(await db.audit_logs.count({ where: { object_id: id, action_code: "PUR-030" } })).toBe(0);
  });
  it("enforces scope and cancel permission in repository as well as service", async () => {
    const id = await create();
    await expect(remove(id, { user: { ...auth.user, dataScopes: [] } })).rejects.toMatchObject({
      httpStatus: 404,
    });
    await expect(
      new PrismaWorkflowRepository(db).deletePurchase(
        id,
        { ...auth.user, permissionCodes: [] },
        async () => undefined,
      ),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });
});
