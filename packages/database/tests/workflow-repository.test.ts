import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, WorkflowCommand } from "@violin-erp/api";
import { PrismaWorkflowRepository } from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const MANUFACTURER_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "55555555-5555-4555-8555-555555555555";
const WAREHOUSE_ID = "66666666-6666-4666-8666-666666666666";
const actor: AuthenticatedUser = {
  dataScopes: ["all"],
  permissionCodes: ["purchase.payment.create"],
  roleCodes: ["administrator"],
  userId: USER_ID,
  username: "admin",
};

describe("Prisma workflow repository", () => {
  it("creates production order with manufacturer and sku validation without touching purchase or inventory", async () => {
    const create = vi.fn().mockResolvedValue({
      id: ORDER_ID,
      production_order_items: [{ planned_quantity: 2 }],
      status: "draft",
      total_amount: 200,
    });
    const client = {
      manufacturers: {
        findFirst: vi.fn().mockResolvedValue({
          id: MANUFACTURER_ID,
          manufacturer_code: "MFR-001",
          manufacturer_name: "生产厂家",
        }),
      },
      production_orders: { create },
      skus: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: SKU_ID,
            sku_code: "SKU-001",
            sku_name: "小提琴 SKU",
            specification: "4/4",
          },
        ]),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "create",
      apiId: "PRO-003",
      mutation: true,
      payload: {
        documentDate: "2026-07-23",
        expectedCompletionDate: "2026-08-23",
        items: [
          {
            plannedQuantity: 2,
            processingUnitPrice: 100,
            skuId: SKU_ID,
          },
        ],
        manufacturerId: MANUFACTURER_ID,
        plannedStartDate: "2026-07-24",
      },
      query: new URLSearchParams(),
      resource: "production",
    };

    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      status: "draft",
      totalAmount: 200,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_items: expect.objectContaining({
            create: [
              expect.objectContaining({
                completed_quantity: 0,
                inbound_quantity: 0,
                line_amount: 200,
                planned_quantity: 2,
                processing_unit_price: 100,
              }),
            ],
          }),
          status: "draft",
          total_amount: 200,
        }),
      }),
    );
    expect(
      (client as { inventories?: unknown; purchase_orders?: unknown }).inventories,
    ).toBeUndefined();
    expect(
      (client as { inventories?: unknown; purchase_orders?: unknown }).purchase_orders,
    ).toBeUndefined();
  });

  it("replaces production order items only while draft and preserves paid amount balance", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({
      id: ORDER_ID,
      production_order_items: [{ planned_quantity: 3 }],
      status: "draft",
      total_amount: 300,
      unpaid_amount: 250,
      version_no: 2,
    });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      production_order_items: {
        deleteMany,
        findMany: vi.fn().mockResolvedValue([
          {
            completed_quantity: 0,
            inbound_quantity: 0,
            inspected_quantity: 0,
            qualified_quantity: 0,
            shipped_quantity: 0,
          },
        ]),
      },
      production_orders: {
        findFirst: vi.fn().mockResolvedValue({
          document_date: new Date("2026-07-23T00:00:00.000Z"),
          expected_completion_date: new Date("2026-08-23T00:00:00.000Z"),
          id: ORDER_ID,
          paid_amount: 50,
          planned_start_date: new Date("2026-07-24T00:00:00.000Z"),
          status: "draft",
          version_no: 1,
        }),
        update,
      },
      skus: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: SKU_ID,
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
      apiId: "PRO-004",
      entityId: ORDER_ID,
      mutation: true,
      payload: {
        items: [{ plannedQuantity: 3, processingUnitPrice: 100, skuId: SKU_ID }],
        versionNo: 1,
      },
      query: new URLSearchParams(),
      resource: "production",
    };

    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      totalAmount: 300,
      unpaidAmount: 250,
      versionNo: 2,
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { production_order_id: ORDER_ID } });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_items: expect.any(Object),
          total_amount: 300,
          unpaid_amount: 250,
          version_no: 2,
        }),
      }),
    );
  });

  it("records production submit and start transitions with version checks", async () => {
    const historyCreate = vi.fn().mockResolvedValue({});
    const update = vi
      .fn()
      .mockResolvedValueOnce({ id: ORDER_ID, status: "pending_approval" })
      .mockResolvedValueOnce({ id: ORDER_ID, status: "in_production" });
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        created_by: USER_ID,
        document_no: "PRO-001",
        id: ORDER_ID,
        status: "draft",
        version_no: 1,
      })
      .mockResolvedValueOnce({
        created_by: "99999999-9999-4999-8999-999999999999",
        document_no: "PRO-001",
        id: ORDER_ID,
        status: "approved",
        version_no: 2,
      });
    const client = {
      document_status_histories: { create: historyCreate },
      production_orders: { findFirst, update },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "submit",
          apiId: "PRO-005",
          entityId: ORDER_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "production",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "pending_approval" });

    await expect(
      repository.execute(
        {
          action: "start",
          apiId: "PRO-010",
          entityId: ORDER_ID,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "production",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "in_production" });

    expect(historyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          object_type: "production",
          to_status: "pending_approval",
        }),
      }),
    );
    expect(historyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          object_type: "production",
          to_status: "in_production",
        }),
      }),
    );
  });

  it("creates production progress with formal stage and quantity constraints", async () => {
    const create = vi.fn().mockResolvedValue({
      completed_quantity: 4,
      id: "77777777-7777-4777-8777-777777777777",
      progress_stage: "in_production",
    });
    const client = {
      production_orders: {
        findFirst: vi.fn().mockResolvedValue({
          id: ORDER_ID,
          production_order_items: [{ planned_quantity: 5 }, { planned_quantity: 5 }],
          status: "in_production",
        }),
      },
      production_progress_records: {
        create,
        findMany: vi.fn().mockResolvedValue([{ completed_quantity: 2 }]),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);
    const command: WorkflowCommand = {
      action: "create",
      apiId: "PRO-020",
      mutation: true,
      parentId: ORDER_ID,
      payload: {
        completedQuantity: 4,
        estimatedCompletionDate: "2026-08-20",
        progressDate: "2026-08-01",
        progressDescription: "生产进行中",
        progressPercentage: 40,
        progressStage: "in_production",
      },
      query: new URLSearchParams(),
      resource: "production-progress",
    };

    await expect(repository.execute(command, actor)).resolves.toMatchObject({
      completedQuantity: 4,
      progressStage: "in_production",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completed_quantity: 4,
          production_order_id: ORDER_ID,
          progress_percentage: 40,
        }),
      }),
    );
  });

  it("confirms production completion without touching inventory", async () => {
    const completionId = "77777777-7777-4777-8777-777777777777";
    const productionOrderItemId = "88888888-8888-4888-8888-888888888888";
    const completionCreate = vi.fn().mockResolvedValue({
      completion_status: "Draft",
      id: completionId,
      production_completion_record_items: [{ completed_quantity: 3 }],
      total_completed_quantity: 3,
    });
    const completionUpdate = vi.fn().mockResolvedValue({
      completion_status: "Confirmed",
      id: completionId,
    });
    const orderItemUpdate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn().mockResolvedValue({
      completion_percentage: 30,
      id: ORDER_ID,
      status: "partially_completed",
    });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      production_completion_records: {
        create: completionCreate,
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            completion_status: "Draft",
            id: completionId,
          })
          .mockResolvedValueOnce({
            id: completionId,
            production_completion_record_items: [
              {
                completed_quantity: 3,
                production_order_item_id: productionOrderItemId,
              },
            ],
            production_order_id: ORDER_ID,
          }),
        update: completionUpdate,
      },
      production_order_items: { update: orderItemUpdate },
      production_orders: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: ORDER_ID,
            production_order_items: [
              {
                completed_quantity: 0,
                id: productionOrderItemId,
                planned_quantity: 10,
                sku_code_snapshot: "SKU-001",
                sku_id: SKU_ID,
                sku_name_snapshot: "小提琴 SKU",
                specification_snapshot: "4/4",
              },
            ],
            status: "in_production",
            version_no: 1,
          })
          .mockResolvedValueOnce({
            id: ORDER_ID,
            production_order_items: [
              {
                completed_quantity: 0,
                id: productionOrderItemId,
                planned_quantity: 10,
              },
            ],
            version_no: 1,
          }),
        update: orderUpdate,
      },
      warehouses: {
        findFirst: vi.fn().mockResolvedValue({ id: WAREHOUSE_ID }),
      },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "PRO-026",
          mutation: true,
          parentId: ORDER_ID,
          payload: {
            completionBatchNo: "BATCH-001",
            completionDate: "2026-08-10",
            items: [
              {
                completedQuantity: 3,
                productionOrderItemId,
                skuId: SKU_ID,
              },
            ],
            productionOrderVersionNo: 1,
            warehouseId: WAREHOUSE_ID,
          },
          query: new URLSearchParams(),
          resource: "production-completion",
        },
        actor,
      ),
    ).resolves.toMatchObject({ completionStatus: "Draft" });

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "PRO-027",
          entityId: completionId,
          mutation: true,
          payload: {},
          query: new URLSearchParams(),
          resource: "production-completion",
        },
        actor,
      ),
    ).resolves.toMatchObject({ completionStatus: "Confirmed" });

    expect(orderItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completed_quantity: { increment: 3 },
        }),
      }),
    );
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completion_percentage: 30,
          status: "partially_completed",
        }),
      }),
    );
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown }).inventories,
    ).toBeUndefined();
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown })
        .inventory_transactions,
    ).toBeUndefined();
  });

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

  it("creates purchase source inspection with source quantity validation without touching inventory", async () => {
    const purchaseOrderItemId = "77777777-7777-4777-8777-777777777777";
    const create = vi.fn().mockResolvedValue({
      id: "88888888-8888-4888-8888-888888888888",
      inspection_order_items: [{ inspected_quantity: 4 }],
      inspection_result: "pending",
      status: "draft",
      total_inspected_quantity: 4,
    });
    const client = {
      inspection_orders: { create },
      purchase_orders: {
        findFirst: vi.fn().mockResolvedValue({
          id: ORDER_ID,
          purchase_order_items: [
            {
              id: purchaseOrderItemId,
              inspected_quantity: 1,
              quantity: 10,
              sku_code_snapshot: "SKU-001",
              sku_id: SKU_ID,
              sku_name_snapshot: "小提琴 SKU",
              specification_snapshot: "4/4",
            },
          ],
          status: "approved",
        }),
      },
      warehouses: { findFirst: vi.fn().mockResolvedValue({ id: WAREHOUSE_ID }) },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "INS-003",
          mutation: true,
          payload: {
            inspectionDate: "2026-08-20",
            inspectionWarehouseId: WAREHOUSE_ID,
            inspectorId: USER_ID,
            items: [
              {
                inspectedQuantity: 4,
                inspectionResult: "unqualified",
                qualifiedQuantity: 3,
                sourceItemId: purchaseOrderItemId,
                skuId: SKU_ID,
                unqualifiedQuantity: 1,
              },
            ],
            purchaseOrderId: ORDER_ID,
            sourceType: "purchase",
          },
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).resolves.toMatchObject({
      inspectionResult: "pending",
      status: "draft",
      totalInspectedQuantity: 4,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inspection_order_items: expect.objectContaining({
            create: [
              expect.objectContaining({
                inspected_quantity: 4,
                pending_quantity: 0,
                qualified_quantity: 3,
                source_item_id: purchaseOrderItemId,
                unqualified_quantity: 1,
              }),
            ],
          }),
          purchase_order_id: ORDER_ID,
          source_type: "purchase",
        }),
      }),
    );
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown }).inventories,
    ).toBeUndefined();
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown })
        .inventory_transactions,
    ).toBeUndefined();
  });

  it("creates production source inspection from completed quantity", async () => {
    const productionOrderItemId = "77777777-7777-4777-8777-777777777777";
    const client = {
      inspection_orders: {
        create: vi.fn().mockResolvedValue({
          id: "88888888-8888-4888-8888-888888888888",
          status: "draft",
          total_qualified_quantity: 2,
        }),
      },
      production_orders: {
        findFirst: vi.fn().mockResolvedValue({
          id: ORDER_ID,
          production_order_items: [
            {
              completed_quantity: 5,
              id: productionOrderItemId,
              inspected_quantity: 1,
              sku_code_snapshot: "SKU-001",
              sku_id: SKU_ID,
              sku_name_snapshot: "小提琴 SKU",
              specification_snapshot: "4/4",
            },
          ],
          status: "in_production",
        }),
      },
      warehouses: { findFirst: vi.fn().mockResolvedValue({ id: WAREHOUSE_ID }) },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "INS-003",
          mutation: true,
          payload: {
            inspectionDate: "2026-08-20",
            inspectionWarehouseId: WAREHOUSE_ID,
            inspectorId: USER_ID,
            items: [
              {
                inspectedQuantity: 2,
                inspectionResult: "qualified",
                qualifiedQuantity: 2,
                sourceItemId: productionOrderItemId,
                skuId: SKU_ID,
                unqualifiedQuantity: 0,
              },
            ],
            productionOrderId: ORDER_ID,
            sourceType: "production",
          },
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "draft", totalQualifiedQuantity: 2 });
  });

  it("rejects inspection double source and unbalanced quantity", async () => {
    const repository = new PrismaWorkflowRepository({} as unknown as PrismaClient);
    const basePayload = {
      inspectionDate: "2026-08-20",
      inspectionWarehouseId: WAREHOUSE_ID,
      inspectorId: USER_ID,
      items: [
        {
          inspectedQuantity: 3,
          inspectionResult: "pending",
          qualifiedQuantity: 1,
          sourceItemId: "77777777-7777-4777-8777-777777777777",
          skuId: SKU_ID,
          unqualifiedQuantity: 1,
        },
      ],
      productionOrderId: ORDER_ID,
      purchaseOrderId: ORDER_ID,
      sourceType: "production",
    };

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "INS-003",
          mutation: true,
          payload: basePayload,
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_INVALID_FIELD" });
  });

  it("submits confirms and revokes inspection while updating source cumulative facts only", async () => {
    const inspectionId = "88888888-8888-4888-8888-888888888888";
    const sourceItemId = "77777777-7777-4777-8777-777777777777";
    const historyCreate = vi.fn().mockResolvedValue({});
    const updateInspection = vi
      .fn()
      .mockResolvedValueOnce({ id: inspectionId, status: "pending_confirmation" })
      .mockResolvedValueOnce({ id: inspectionId, status: "confirmed" })
      .mockResolvedValueOnce({ id: inspectionId, status: "revoked" });
    const sourceUpdate = vi.fn().mockResolvedValue({});
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        document_no: "INS-001",
        id: inspectionId,
        status: "draft",
        version_no: 1,
      })
      .mockResolvedValueOnce({
        id: inspectionId,
        inspection_order_items: [],
      })
      .mockResolvedValueOnce({
        document_no: "INS-001",
        id: inspectionId,
        source_type: "purchase",
        status: "pending_confirmation",
        version_no: 2,
      })
      .mockResolvedValueOnce({
        id: inspectionId,
        inspection_order_items: [
          {
            inspected_quantity: 4,
            qualified_quantity: 3,
            source_item_id: sourceItemId,
          },
        ],
      })
      .mockResolvedValueOnce({
        document_no: "INS-001",
        id: inspectionId,
        source_type: "purchase",
        status: "confirmed",
        version_no: 3,
      })
      .mockResolvedValueOnce({
        id: inspectionId,
        inspection_order_items: [
          {
            inspected_quantity: 4,
            qualified_quantity: 3,
            source_item_id: sourceItemId,
          },
        ],
      });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: historyCreate },
      inbound_orders: { count: vi.fn().mockResolvedValue(0) },
      inspection_orders: { findFirst, update: updateInspection },
      purchase_order_items: { update: sourceUpdate },
    };
    const repository = new PrismaWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "submit",
          apiId: "INS-005",
          entityId: inspectionId,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "pending_confirmation" });

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "INS-006",
          entityId: inspectionId,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "confirmed" });

    await expect(
      repository.execute(
        {
          action: "revoke",
          apiId: "INS-007",
          entityId: inspectionId,
          mutation: true,
          payload: { reason: "录入错误", versionNo: 3 },
          query: new URLSearchParams(),
          resource: "inspection",
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: "revoked" });

    expect(sourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inspected_quantity: { increment: 4 },
          qualified_quantity: { increment: 3 },
        }),
        where: { id: sourceItemId },
      }),
    );
    expect(sourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inspected_quantity: { increment: -4 },
          qualified_quantity: { increment: -3 },
        }),
        where: { id: sourceItemId },
      }),
    );
    expect(historyCreate).toHaveBeenCalledTimes(3);
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown }).inventories,
    ).toBeUndefined();
    expect(
      (client as { inventories?: unknown; inventory_transactions?: unknown })
        .inventory_transactions,
    ).toBeUndefined();
  });
});
