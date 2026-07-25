import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, WorkflowCommand } from "@violin-erp/api";
import { PrismaWorkflowRepository } from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const actor: AuthenticatedUser = {
  dataScopes: ["all"],
  permissionCodes: ["purchase.payment.create"],
  roleCodes: ["administrator"],
  userId: USER_ID,
  username: "admin",
};

describe("Prisma workflow repository", () => {
  it("creates purchase order with supplier and sku validation without touching inventory", async () => {
    const create = vi.fn().mockResolvedValue({
      id: ORDER_ID,
      purchase_order_items: [{ quantity: 2 }],
      status: "draft",
      total_amount: 210,
    });
    const client = {
      purchase_orders: { create },
      skus: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "55555555-5555-4555-8555-555555555555",
            sku_code: "SKU-001",
            sku_name: "小提琴 SKU",
            specification: "4/4",
          },
        ]),
      },
      suppliers: {
        findFirst: vi.fn().mockResolvedValue({
          id: "33333333-3333-4333-8333-333333333333",
          supplier_code: "SUP-001",
          supplier_name: "供应商",
        }),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "create",
      apiId: "PUR-003",
      mutation: true,
      payload: {
        documentDate: "2026-07-23",
        expectedDeliveryDate: "2026-08-01",
        items: [
          {
            quantity: 2,
            skuId: "55555555-5555-4555-8555-555555555555",
            taxRate: 0.05,
            unitPrice: 100,
          },
        ],
        settlementMethod: "bank_transfer",
        supplierId: "33333333-3333-4333-8333-333333333333",
      },
      query: new URLSearchParams(),
      resource: "purchase",
    };

    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      status: "draft",
      totalAmount: 210,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchase_order_items: expect.objectContaining({
            create: [
              expect.objectContaining({
                inbound_quantity: 0,
                line_amount: 200,
                quantity: 2,
                tax_amount: 10,
              }),
            ],
          }),
          status: "draft",
          total_amount: 210,
        }),
      }),
    );
    expect((client as { inventories?: unknown }).inventories).toBeUndefined();
  });

  it("replaces purchase order items only while draft and preserves paid amount balance", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({
      id: ORDER_ID,
      purchase_order_items: [{ quantity: 3 }],
      status: "draft",
      total_amount: 300,
      unpaid_amount: 250,
      version_no: 2,
    });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      purchase_order_items: { deleteMany },
      purchase_orders: {
        findFirst: vi.fn().mockResolvedValue({
          expected_delivery_date: new Date("2026-08-01T00:00:00.000Z"),
          id: ORDER_ID,
          paid_amount: 50,
          status: "draft",
          version_no: 1,
        }),
        update,
      },
      skus: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "55555555-5555-4555-8555-555555555555",
            sku_code: "SKU-001",
            sku_name: "小提琴 SKU",
            specification: "4/4",
          },
        ]),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "update",
      apiId: "PUR-004",
      entityId: ORDER_ID,
      mutation: true,
      payload: {
        documentDate: "2026-07-23",
        items: [
          {
            quantity: 3,
            skuId: "55555555-5555-4555-8555-555555555555",
            taxRate: 0,
            unitPrice: 100,
          },
        ],
        versionNo: 1,
      },
      query: new URLSearchParams(),
      resource: "purchase",
    };

    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      totalAmount: 300,
      unpaidAmount: 250,
      versionNo: 2,
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { purchase_order_id: ORDER_ID } });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchase_order_items: expect.any(Object),
          total_amount: 300,
          unpaid_amount: 250,
          version_no: 2,
        }),
      }),
    );
  });

  it("prevents self approval and records purchase status history for valid submit", async () => {
    const historyCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({ id: ORDER_ID, status: "pending_approval" });
    const client = {
      document_status_histories: { create: historyCreate },
      purchase_orders: {
        findFirst: vi.fn().mockResolvedValue({
          created_by: USER_ID,
          document_no: "PO-001",
          id: ORDER_ID,
          status: "draft",
          version_no: 1,
        }),
        update,
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const submit: WorkflowCommand = {
      action: "submit",
      apiId: "PUR-005",
      entityId: ORDER_ID,
      mutation: true,
      payload: { versionNo: 1 },
      query: new URLSearchParams(),
      resource: "purchase",
    };

    await expect(repository.execute(submit, actor)).resolves.toMatchObject({
      status: "pending_approval",
    });
    expect(historyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          from_status: "draft",
          object_type: "purchase",
          to_status: "pending_approval",
        }),
      }),
    );

    client.purchase_orders.findFirst.mockResolvedValueOnce({
      created_by: USER_ID,
      document_no: "PO-001",
      id: ORDER_ID,
      status: "pending_approval",
      version_no: 2,
    });
    await expect(
      repository.execute(
        {
          action: "approve",
          apiId: "PUR-007",
          entityId: ORDER_ID,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "purchase",
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT_REQUEST" });
  });

  it("uses an impossible filter when no record scope is granted", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const repository = new PrismaWorkflowRepository({
      purchase_orders: { count, findMany },
    } as unknown as PrismaClient);

    await repository.execute(
      {
        action: "list",
        apiId: "PUR-001",
        mutation: false,
        payload: {},
        query: new URLSearchParams(),
        resource: "purchase",
      },
      { ...actor, dataScopes: [], permissionCodes: ["purchase.order.read"] },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ id: { in: [] } }] },
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { AND: [{ id: { in: [] } }] } });
  });

  it("records purchase payment without changing purchase lifecycle status", async () => {
    const order = {
      currency_code: "CNY",
      id: ORDER_ID,
      paid_amount: 10,
      status: "approved",
      supplier_id: "33333333-3333-4333-8333-333333333333",
      unpaid_amount: 90,
    };
    const payment = { id: "44444444-4444-4444-8444-444444444444", payment_status: "confirmed" };
    const update = vi.fn().mockResolvedValue({ ...order, paid_amount: 30, unpaid_amount: 70 });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      purchase_orders: {
        findFirst: vi.fn().mockResolvedValue(order),
        update,
      },
      purchase_payments: { create: vi.fn().mockResolvedValue(payment) },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "create",
      apiId: "PUR-019",
      mutation: true,
      parentId: ORDER_ID,
      payload: {
        attachmentRequired: false,
        payeeAccountSnapshot: "安全快照",
        paymentAmount: 20,
        paymentDate: "2026-07-23",
        paymentMethod: "bank_transfer",
      },
      query: new URLSearchParams(),
      resource: "purchase-payment",
    };
    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      paymentStatus: "confirmed",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: expect.anything() }),
      }),
    );
  });

  it("rejects purchase payment before purchase order approval", async () => {
    const client = {
      purchase_orders: {
        findFirst: vi.fn().mockResolvedValue({
          currency_code: "CNY",
          id: ORDER_ID,
          paid_amount: 0,
          status: "draft",
          supplier_id: "33333333-3333-4333-8333-333333333333",
          unpaid_amount: 100,
        }),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "create",
      apiId: "PUR-019",
      mutation: true,
      parentId: ORDER_ID,
      payload: {
        attachmentRequired: false,
        payeeAccountSnapshot: "安全快照",
        paymentAmount: 20,
        paymentDate: "2026-07-23",
        paymentMethod: "bank_transfer",
      },
      query: new URLSearchParams(),
      resource: "purchase-payment",
    };

    await expect(repository.execute(command, actor)).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
    });
  });
});
