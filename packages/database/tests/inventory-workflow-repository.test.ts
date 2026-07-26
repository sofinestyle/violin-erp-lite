import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, InventoryWorkflowCommand, RequestContext } from "@violin-erp/api";
import { applyInventoryMovements, PrismaInventoryWorkflowRepository } from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";
const SECOND_SKU_ID = "44444444-4444-4444-8444-444444444445";
const SOURCE_WAREHOUSE_ID = "55555555-5555-4555-8555-555555555555";
const TRANSIT_WAREHOUSE_ID = "66666666-6666-4666-8666-666666666666";
const OVERSEAS_WAREHOUSE_ID = "88888888-8888-4888-8888-888888888888";
const PLATFORM_ID = "99999999-9999-4999-8999-999999999991";
const STORE_ID = "99999999-9999-4999-8999-999999999992";
const actor: AuthenticatedUser = {
  dataScopes: ["all"],
  permissionCodes: ["transfer.order.ship"],
  roleCodes: ["administrator"],
  userId: USER_ID,
  username: "admin",
};
const context: RequestContext = {
  requestId: "77777777-7777-4777-8777-777777777777",
  timestamp: "2026-07-23T00:00:00.000Z",
};

describe("inventory transaction repository", () => {
  it("filters store workflows by the current resolved store assignments", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const repository = new PrismaInventoryWorkflowRepository({
      outbound_orders: { count, findMany },
    } as unknown as PrismaClient);
    const storeId = "88888888-8888-4888-8888-888888888888";

    await repository.execute(
      {
        action: "list",
        apiId: "OUT-001",
        mutation: false,
        payload: {},
        query: new URLSearchParams(),
        resource: "outbound",
      },
      {
        ...actor,
        dataScopes: ["business_related", "store"],
        permissionCodes: ["outbound.order.read"],
        storeScopes: [{ accessLevel: "read", targetId: storeId }],
      },
      context,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ stores: { id: { in: [storeId] } } }] },
      }),
    );
  });

  it("updates balance and writes immutable ledger rows together", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue({});
    const client = {
      inventories: {
        findFirst: vi.fn().mockResolvedValue({ on_hand_quantity: 10 }),
        upsert,
      },
      inventory_transactions: { create },
    };
    await applyInventoryMovements(
      client as never,
      [
        {
          delta: -3,
          itemId: ITEM_ID,
          skuId: SKU_ID,
          unitCost: 2,
          warehouseId: SOURCE_WAREHOUSE_ID,
        },
      ],
      {
        actorId: USER_ID,
        documentId: DOCUMENT_ID,
        documentType: "outbound",
      },
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ on_hand_quantity: { increment: -3 } }),
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "out",
          quantity: 3,
          quantity_after: 7,
          source_document_id: DOCUMENT_ID,
        }),
      }),
    );
  });

  it("creates outbound order without touching inventory or ledger rows", async () => {
    const create = vi.fn().mockResolvedValue({
      id: DOCUMENT_ID,
      outbound_order_items: [{ id: ITEM_ID }],
      status: "draft",
      total_quantity: 3,
    });
    const client = {
      outbound_orders: { create },
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
      warehouses: { findFirst: vi.fn().mockResolvedValue({ id: SOURCE_WAREHOUSE_ID }) },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create-other",
          apiId: "OUT-004",
          mutation: true,
          payload: {
            documentDate: "2026-07-26",
            items: [{ batchNo: "B-001", quantity: 3, skuId: SKU_ID, unitCost: 10 }],
            warehouseId: SOURCE_WAREHOUSE_ID,
          },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "draft", totalQuantity: 3 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outbound_order_items: expect.objectContaining({ create: [expect.any(Object)] }),
          outbound_type: "other",
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
      }),
    );
    expect((client as { inventories?: unknown }).inventories).toBeUndefined();
    expect((client as { inventory_transactions?: unknown }).inventory_transactions).toBeUndefined();
  });

  it("confirms outbound by atomically deducting inventory and writing ledger rows", async () => {
    const inventoryFind = vi
      .fn()
      .mockResolvedValueOnce({
        available_quantity: 10,
        id: "inventory-1",
        on_hand_quantity: 10,
      })
      .mockResolvedValueOnce({
        available_quantity: 7,
        id: "inventory-1",
        on_hand_quantity: 7,
      });
    const inventoryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transactionCreate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "completed" });
    const historyCreate = vi.fn().mockResolvedValue({});
    const document = {
      document_no: "OUT-001",
      id: DOCUMENT_ID,
      outbound_order_items: [
        {
          batch_no: "B-001",
          id: ITEM_ID,
          line_cost: 30,
          quantity: 3,
          sku_id: SKU_ID,
          unit_cost: 10,
        },
      ],
      outbound_type: "other",
      status: "approved",
      version_no: 2,
      warehouse_id: SOURCE_WAREHOUSE_ID,
    };
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: historyCreate },
      inventories: {
        findFirst: inventoryFind,
        updateMany: inventoryUpdateMany,
      },
      inventory_transactions: { create: transactionCreate },
      outbound_orders: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce({
            ...document,
            status: "completed",
          }),
        update: orderUpdate,
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "OUT-012",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "completed" });

    expect(inventoryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          available_quantity: { decrement: 3 },
          on_hand_quantity: { decrement: 3 },
        }),
        where: expect.objectContaining({
          available_quantity: { gte: 3 },
          id: "inventory-1",
          on_hand_quantity: { gte: 3 },
        }),
      }),
    );
    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "out",
          quantity: 3,
          quantity_after: 7,
          quantity_before: 10,
          source_document_id: DOCUMENT_ID,
          source_document_item_id: ITEM_ID,
          source_document_type: "outbound_order",
          transaction_type: "other",
        }),
      }),
    );
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "completed" }),
        where: { id: DOCUMENT_ID },
      }),
    );
    expect(historyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          from_status: "approved",
          object_type: "outbound",
          to_status: "completed",
        }),
      }),
    );
  });

  it("prevents outbound confirmation from creating negative stock", async () => {
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn() },
      inventories: {
        findFirst: vi.fn().mockResolvedValue({
          available_quantity: 1,
          id: "inventory-1",
          on_hand_quantity: 1,
        }),
        updateMany: vi.fn(),
      },
      inventory_transactions: { create: vi.fn() },
      outbound_orders: {
        findFirst: vi.fn().mockResolvedValue({
          document_no: "OUT-001",
          id: DOCUMENT_ID,
          outbound_order_items: [
            {
              id: ITEM_ID,
              line_cost: 30,
              quantity: 3,
              sku_id: SKU_ID,
              unit_cost: 10,
            },
          ],
          outbound_type: "other",
          status: "approved",
          version_no: 1,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
        update: vi.fn(),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "OUT-012",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT_REQUEST" });
    expect(client.inventories.updateMany).not.toHaveBeenCalled();
    expect(client.inventory_transactions.create).not.toHaveBeenCalled();
    expect(client.outbound_orders.update).not.toHaveBeenCalled();
  });

  it("does not deduct inventory twice when outbound confirmation is repeated", async () => {
    const client = {
      outbound_orders: {
        findFirst: vi.fn().mockResolvedValue({
          id: DOCUMENT_ID,
          status: "completed",
          version_no: 3,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "OUT-012",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 3 },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "completed" });
    expect((client as { inventories?: unknown }).inventories).toBeUndefined();
    expect((client as { inventory_transactions?: unknown }).inventory_transactions).toBeUndefined();
  });

  it("reverses completed outbound with a related reverse ledger row", async () => {
    const inventoryUpsert = vi.fn().mockResolvedValue({ id: "inventory-1", on_hand_quantity: 10 });
    const transactionCreate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "reversed" });
    const document = {
      document_no: "OUT-001",
      id: DOCUMENT_ID,
      outbound_order_items: [
        {
          batch_no: "B-001",
          id: ITEM_ID,
          line_cost: 30,
          quantity: 3,
          sku_id: SKU_ID,
          unit_cost: 10,
        },
      ],
      outbound_type: "other",
      status: "completed",
      version_no: 3,
      warehouse_id: SOURCE_WAREHOUSE_ID,
    };
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn().mockResolvedValue({}) },
      inventories: {
        findFirst: vi.fn().mockResolvedValue({ id: "inventory-1", on_hand_quantity: 7 }),
        upsert: inventoryUpsert,
      },
      inventory_transactions: {
        create: transactionCreate,
        findMany: vi.fn().mockResolvedValue([
          {
            id: "99999999-9999-4999-8999-999999999999",
            source_document_item_id: ITEM_ID,
          },
        ]),
      },
      outbound_orders: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce({
            ...document,
            status: "reversed",
          }),
        update: orderUpdate,
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "reverse",
          apiId: "OUT-013",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { reason: "客户取消", versionNo: 3 },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "reversed" });

    expect(inventoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          available_quantity: { increment: 3 },
          on_hand_quantity: { increment: 3 },
        }),
      }),
    );
    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "in",
          quantity: 3,
          related_transaction_id: "99999999-9999-4999-8999-999999999999",
          source_document_type: "outbound_order",
          transaction_type: "other_reversal",
        }),
      }),
    );
  });

  it("keeps outbound status unchanged when outbound ledger writing fails", async () => {
    const orderUpdate = vi.fn();
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn() },
      inventories: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            available_quantity: 10,
            id: "inventory-1",
            on_hand_quantity: 10,
          })
          .mockResolvedValueOnce({
            available_quantity: 7,
            id: "inventory-1",
            on_hand_quantity: 7,
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      inventory_transactions: { create: vi.fn().mockRejectedValue(new Error("ledger failed")) },
      outbound_orders: {
        findFirst: vi.fn().mockResolvedValue({
          document_no: "OUT-001",
          id: DOCUMENT_ID,
          outbound_order_items: [
            {
              id: ITEM_ID,
              line_cost: 30,
              quantity: 3,
              sku_id: SKU_ID,
              unit_cost: 10,
            },
          ],
          outbound_type: "other",
          status: "approved",
          version_no: 1,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
        update: orderUpdate,
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "confirm",
          apiId: "OUT-012",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "outbound",
        },
        actor,
        context,
      ),
    ).rejects.toThrow("ledger failed");
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("creates inventory adjustment without touching inventory balances or ledger rows", async () => {
    const adjustmentCreate = vi.fn().mockResolvedValue({
      id: DOCUMENT_ID,
      inventory_adjustment_items: [{ id: ITEM_ID }],
      status: "draft",
    });
    const client = {
      inventory_adjustments: { create: adjustmentCreate },
      inventories: {
        findFirst: vi.fn().mockResolvedValue({
          available_quantity: 8,
          id: "inventory-1",
          on_hand_quantity: 10,
        }),
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
      warehouses: { findFirst: vi.fn().mockResolvedValue({ id: SOURCE_WAREHOUSE_ID }) },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "INV-015",
          mutation: true,
          payload: {
            adjustmentReason: "盘点差异",
            adjustmentType: "stock_count_difference",
            documentDate: "2026-07-26",
            items: [
              {
                adjustmentDirection: "decrease",
                adjustmentQuantity: 3,
                skuId: SKU_ID,
                unitCost: 10,
              },
            ],
            warehouseId: SOURCE_WAREHOUSE_ID,
          },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "draft" });

    expect(adjustmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventory_adjustment_items: {
            create: [
              expect.objectContaining({
                adjustment_direction: "decrease",
                adjustment_quantity: 3,
                quantity_after: 7,
                quantity_before: 10,
              }),
            ],
          },
          total_decrease_quantity: 3,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
      }),
    );
    expect((client as { inventory_transactions?: unknown }).inventory_transactions).toBeUndefined();
  });

  it("submits and approves inventory adjustments with status history", async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ id: DOCUMENT_ID, status: "pending_approval" })
      .mockResolvedValueOnce({ id: DOCUMENT_ID, status: "approved" });
    const historyCreate = vi.fn().mockResolvedValue({});
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        document_no: "ADJ-001",
        id: DOCUMENT_ID,
        inventory_adjustment_items: [],
        status: "draft",
        version_no: 1,
        warehouse_id: SOURCE_WAREHOUSE_ID,
      })
      .mockResolvedValueOnce({ id: DOCUMENT_ID, status: "pending_approval" })
      .mockResolvedValueOnce({
        document_no: "ADJ-001",
        id: DOCUMENT_ID,
        inventory_adjustment_items: [],
        status: "pending_approval",
        version_no: 2,
        warehouse_id: SOURCE_WAREHOUSE_ID,
      })
      .mockResolvedValueOnce({ id: DOCUMENT_ID, status: "approved" });
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: historyCreate },
      inventory_adjustments: { findFirst, update },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "submit",
          apiId: "INV-017",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "pending_approval" });
    await expect(
      repository.execute(
        {
          action: "approve",
          apiId: "INV-019",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "approved" });

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending_approval" }),
      }),
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: "approved" }),
      }),
    );
    expect(historyCreate).toHaveBeenCalledTimes(2);
  });

  it("executes inventory adjustment by atomically changing inventory and writing ledger rows", async () => {
    const inventoryFind = vi
      .fn()
      .mockResolvedValueOnce({
        available_quantity: 10,
        id: "inventory-1",
        on_hand_quantity: 10,
      })
      .mockResolvedValueOnce({
        available_quantity: 7,
        id: "inventory-1",
        on_hand_quantity: 7,
      });
    const inventoryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transactionCreate = vi.fn().mockResolvedValue({});
    const adjustmentUpdate = vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "completed" });
    const historyCreate = vi.fn().mockResolvedValue({});
    const document = {
      adjustment_reason: "盘点差异",
      adjustment_type: "stock_count_difference",
      document_no: "ADJ-001",
      id: DOCUMENT_ID,
      inventory_adjustment_items: [
        {
          adjustment_direction: "decrease",
          adjustment_quantity: 3,
          amount: 30,
          batch_no: "B-001",
          id: ITEM_ID,
          sku_id: SKU_ID,
          unit_cost: 10,
        },
      ],
      status: "approved",
      version_no: 2,
      warehouse_id: SOURCE_WAREHOUSE_ID,
    };
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: historyCreate },
      inventories: {
        findFirst: inventoryFind,
        updateMany: inventoryUpdateMany,
      },
      inventory_adjustments: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce({ ...document, status: "completed" }),
        update: adjustmentUpdate,
      },
      inventory_transactions: { create: transactionCreate },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "execute",
          apiId: "INV-024",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 2 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "completed" });

    expect(inventoryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          available_quantity: { decrement: 3 },
          on_hand_quantity: { decrement: 3 },
        }),
        where: expect.objectContaining({
          available_quantity: { gte: 3 },
          id: "inventory-1",
          on_hand_quantity: { gte: 3 },
        }),
      }),
    );
    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "out",
          quantity: 3,
          quantity_after: 7,
          quantity_before: 10,
          source_document_id: DOCUMENT_ID,
          source_document_item_id: ITEM_ID,
          source_document_type: "inventory_adjustment",
          transaction_type: "stock_count_difference",
        }),
      }),
    );
    expect(adjustmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adjusted_at: expect.any(Date), status: "completed" }),
      }),
    );
    expect(historyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          from_status: "approved",
          object_type: "inventory-adjustment",
          to_status: "completed",
        }),
      }),
    );
  });

  it("prevents inventory adjustment execution from creating negative stock", async () => {
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn() },
      inventories: {
        findFirst: vi.fn().mockResolvedValue({
          available_quantity: 1,
          id: "inventory-1",
          on_hand_quantity: 1,
        }),
        updateMany: vi.fn(),
      },
      inventory_adjustments: {
        findFirst: vi.fn().mockResolvedValue({
          document_no: "ADJ-001",
          id: DOCUMENT_ID,
          inventory_adjustment_items: [
            {
              adjustment_direction: "decrease",
              adjustment_quantity: 3,
              id: ITEM_ID,
              sku_id: SKU_ID,
              unit_cost: 10,
            },
          ],
          status: "approved",
          version_no: 1,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
        update: vi.fn(),
      },
      inventory_transactions: { create: vi.fn() },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "execute",
          apiId: "INV-024",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT_REQUEST" });
    expect(client.inventories.updateMany).not.toHaveBeenCalled();
    expect(client.inventory_transactions.create).not.toHaveBeenCalled();
    expect(client.inventory_adjustments.update).not.toHaveBeenCalled();
  });

  it("does not execute an inventory adjustment twice", async () => {
    const client = {
      inventory_adjustments: {
        findFirst: vi.fn().mockResolvedValue({
          id: DOCUMENT_ID,
          status: "completed",
          version_no: 3,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "execute",
          apiId: "INV-024",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 3 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "completed" });
    expect((client as { inventories?: unknown }).inventories).toBeUndefined();
    expect((client as { inventory_transactions?: unknown }).inventory_transactions).toBeUndefined();
  });

  it("keeps adjustment status unchanged when adjustment ledger writing fails", async () => {
    const adjustmentUpdate = vi.fn();
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn() },
      inventories: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            available_quantity: 10,
            id: "inventory-1",
            on_hand_quantity: 10,
          })
          .mockResolvedValueOnce({
            available_quantity: 7,
            id: "inventory-1",
            on_hand_quantity: 7,
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      inventory_adjustments: {
        findFirst: vi.fn().mockResolvedValue({
          document_no: "ADJ-001",
          id: DOCUMENT_ID,
          inventory_adjustment_items: [
            {
              adjustment_direction: "decrease",
              adjustment_quantity: 3,
              id: ITEM_ID,
              sku_id: SKU_ID,
              unit_cost: 10,
            },
          ],
          status: "approved",
          version_no: 1,
          warehouse_id: SOURCE_WAREHOUSE_ID,
        }),
        update: adjustmentUpdate,
      },
      inventory_transactions: { create: vi.fn().mockRejectedValue(new Error("ledger failed")) },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "execute",
          apiId: "INV-024",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "inventory-adjustment",
        },
        actor,
        context,
      ),
    ).rejects.toThrow("ledger failed");
    expect(adjustmentUpdate).not.toHaveBeenCalled();
  });

  it("rejects any movement that would create negative stock", async () => {
    const client = {
      inventories: {
        findFirst: vi.fn().mockResolvedValue({ on_hand_quantity: 1 }),
        upsert: vi.fn(),
      },
      inventory_transactions: { create: vi.fn() },
    };
    await expect(
      applyInventoryMovements(
        client as never,
        [
          {
            delta: -2,
            itemId: ITEM_ID,
            skuId: SKU_ID,
            warehouseId: SOURCE_WAREHOUSE_ID,
          },
        ],
        { actorId: USER_ID, documentId: DOCUMENT_ID, documentType: "damage" },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT_REQUEST" });
    expect(client.inventories.upsert).not.toHaveBeenCalled();
    expect(client.inventory_transactions.create).not.toHaveBeenCalled();
  });

  it("ships transfer stock source-to-transit with paired ledger entries", async () => {
    const inventoryFind = vi
      .fn()
      .mockResolvedValueOnce({ on_hand_quantity: 10 })
      .mockResolvedValueOnce({ on_hand_quantity: 0 });
    const transactionCreate = vi.fn().mockResolvedValue({});
    const updated = {
      id: DOCUMENT_ID,
      status: "shipped",
      transfer_order_items: [],
    };
    const document = {
      document_no: "TRF-001",
      id: DOCUMENT_ID,
      source_warehouse_id: SOURCE_WAREHOUSE_ID,
      status: "approved",
      transit_warehouse_id: TRANSIT_WAREHOUSE_ID,
      transfer_order_items: [
        {
          batch_no: "B-1",
          id: ITEM_ID,
          quantity: 4,
          sku_id: SKU_ID,
          unit_cost: 2,
        },
      ],
      version_no: 1,
    };
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn().mockResolvedValue({}) },
      inventories: {
        findFirst: inventoryFind,
        upsert: vi.fn().mockResolvedValue({}),
      },
      inventory_transactions: { create: transactionCreate },
      transfer_orders: {
        findFirst: vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(updated),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);
    const command: InventoryWorkflowCommand = {
      action: "ship",
      apiId: "TRF-011",
      entityId: DOCUMENT_ID,
      mutation: true,
      payload: { versionNo: 1 },
      query: new URLSearchParams(),
      resource: "transfer",
    };
    await expect(repository.execute(command, actor, context)).resolves.toMatchObject({
      status: "shipped",
    });
    expect(transactionCreate).toHaveBeenCalledTimes(2);
    expect(transactionCreate.mock.calls.map((call) => call[0].data.direction)).toEqual([
      "out",
      "in",
    ]);
  });

  it("completes stock count without directly changing inventory", async () => {
    const document = {
      document_no: "STC-001",
      id: DOCUMENT_ID,
      status: "in_progress",
      stock_count_items: [],
      version_no: 1,
    };
    const inventoryUpdate = vi.fn();
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      document_status_histories: { create: vi.fn().mockResolvedValue({}) },
      inventories: { update: inventoryUpdate },
      stock_counts: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce({
            ...document,
            status: "completed",
          }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);
    await repository.execute(
      {
        action: "complete",
        apiId: "STC-012",
        entityId: DOCUMENT_ID,
        mutation: true,
        payload: { versionNo: 1 },
        query: new URLSearchParams(),
        resource: "stock-count",
      },
      actor,
      context,
    );
    expect(inventoryUpdate).not.toHaveBeenCalled();
  });

  it("creates cross-border shipment only after validating warehouse roles and without touching inventory", async () => {
    const shipmentCreate = vi.fn().mockResolvedValue({
      cross_border_shipment_items: [{ id: ITEM_ID }],
      id: DOCUMENT_ID,
      shipment_status: "draft",
      status: "draft",
    });
    const client = {
      cross_border_shipments: { create: shipmentCreate },
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
      warehouses: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: SOURCE_WAREHOUSE_ID, warehouse_type: "company" })
          .mockResolvedValueOnce({ id: TRANSIT_WAREHOUSE_ID, warehouse_type: "transit" })
          .mockResolvedValueOnce({ id: OVERSEAS_WAREHOUSE_ID, warehouse_type: "overseas" }),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "create",
          apiId: "CBR-003",
          mutation: true,
          payload: {
            carrierName: "承运商",
            departureDate: "2026-07-26",
            destinationCountry: "US",
            destinationWarehouseId: OVERSEAS_WAREHOUSE_ID,
            documentDate: "2026-07-26",
            estimatedArrivalDate: "2026-08-26",
            items: [{ batchNo: "B-001", quantity: 3, skuId: SKU_ID, unitCost: 10 }],
            shipmentBatchNo: "CB-001",
            sourceWarehouseId: SOURCE_WAREHOUSE_ID,
            trackingNo: "TRACK-001",
            transitWarehouseId: TRANSIT_WAREHOUSE_ID,
            transportMethod: "sea",
          },
          query: new URLSearchParams(),
          resource: "cross-border",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "draft" });

    expect(shipmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cross_border_shipment_items: expect.objectContaining({ create: [expect.any(Object)] }),
          destination_warehouse_id: OVERSEAS_WAREHOUSE_ID,
          source_warehouse_id: SOURCE_WAREHOUSE_ID,
          transit_warehouse_id: TRANSIT_WAREHOUSE_ID,
        }),
      }),
    );
    expect((client as { inventory_transactions?: unknown }).inventory_transactions).toBeUndefined();
  });

  it("dispatches cross-border shipment by moving stock from source to transit with ledger rows", async () => {
    const transactionCreate = vi.fn().mockResolvedValue({});
    const shipmentUpdate = vi.fn().mockResolvedValue({ id: DOCUMENT_ID, status: "shipped" });
    const document = {
      cross_border_shipment_items: [
        {
          batch_no: "B-001",
          id: ITEM_ID,
          quantity: 3,
          sku_id: SKU_ID,
          unit_cost: 10,
        },
      ],
      destination_warehouse_id: OVERSEAS_WAREHOUSE_ID,
      document_no: "CBR-001",
      id: DOCUMENT_ID,
      shipment_status: "approved",
      source_warehouse_id: SOURCE_WAREHOUSE_ID,
      status: "approved",
      transit_warehouse_id: TRANSIT_WAREHOUSE_ID,
      version_no: 1,
    };
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      cross_border_shipment_items: { update: vi.fn().mockResolvedValue({}) },
      cross_border_shipments: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(document)
          .mockResolvedValueOnce({
            ...document,
            shipment_status: "shipped",
            status: "shipped",
          }),
        update: shipmentUpdate,
      },
      document_status_histories: { create: vi.fn().mockResolvedValue({}) },
      inventories: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ available_quantity: 10, on_hand_quantity: 10 })
          .mockResolvedValueOnce({ available_quantity: 5, on_hand_quantity: 5 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      inventory_transactions: { create: transactionCreate },
      warehouses: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: SOURCE_WAREHOUSE_ID, warehouse_type: "company" })
          .mockResolvedValueOnce({ id: TRANSIT_WAREHOUSE_ID, warehouse_type: "transit" })
          .mockResolvedValueOnce({ id: OVERSEAS_WAREHOUSE_ID, warehouse_type: "overseas" }),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "dispatch",
          apiId: "CBR-012",
          entityId: DOCUMENT_ID,
          mutation: true,
          payload: { versionNo: 1 },
          query: new URLSearchParams(),
          resource: "cross-border",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "shipped" });

    expect(transactionCreate).toHaveBeenCalledTimes(2);
    expect(transactionCreate.mock.calls.map((call) => call[0].data)).toEqual([
      expect.objectContaining({
        direction: "out",
        quantity: 3,
        source_document_type: "cross-border",
        warehouse_id: SOURCE_WAREHOUSE_ID,
      }),
      expect.objectContaining({
        direction: "in",
        quantity: 3,
        source_document_type: "cross-border",
        warehouse_id: TRANSIT_WAREHOUSE_ID,
      }),
    ]);
    expect(shipmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shipment_status: "shipped", status: "shipped" }),
      }),
    );
    expect(client.cross_border_shipment_items.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shipped_quantity: 3 }),
        where: { id: ITEM_ID },
      }),
    );
  });

  it("executes overseas inventory import by moving transit stock into overseas warehouse", async () => {
    const importTaskId = "99999999-9999-4999-8999-999999999999";
    const importItemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const matchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const shipmentItem = {
      batch_no: "B-001",
      cross_border_shipments: {
        id: DOCUMENT_ID,
        transit_warehouse_id: TRANSIT_WAREHOUSE_ID,
      },
      id: ITEM_ID,
      quantity: 3,
      received_quantity: 0,
      shipped_quantity: 3,
      sku_id: SKU_ID,
      unit_cost: 10,
    };
    const task = {
      id: importTaskId,
      import_task_items: [
        {
          id: importItemId,
          execution_status: "pending",
          raw_data: { crossBorderShipmentItemId: ITEM_ID, quantity: 3, skuId: SKU_ID },
          validation_status: "valid",
        },
      ],
      status: "pending_confirmation",
      warehouse_id: OVERSEAS_WAREHOUSE_ID,
    };
    const transactionCreate = vi.fn().mockResolvedValue({});
    const client = {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(client),
      cross_border_shipment_items: {
        findFirst: vi.fn().mockResolvedValue(shipmentItem),
        update: vi.fn().mockResolvedValue({}),
      },
      import_task_items: {
        findMany: vi.fn().mockResolvedValue([{ execution_status: "succeeded" }]),
        update: vi.fn().mockResolvedValue({}),
      },
      import_tasks: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(task)
          .mockResolvedValueOnce({ ...task, status: "succeeded" }),
        update: vi.fn().mockResolvedValue({}),
      },
      inventories: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ available_quantity: 5, on_hand_quantity: 5 })
          .mockResolvedValueOnce({ available_quantity: 1, on_hand_quantity: 1 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      inventory_transactions: { create: transactionCreate },
      shipment_import_matches: {
        findFirst: vi.fn().mockResolvedValue({
          cross_border_shipment_item_id: ITEM_ID,
          id: matchId,
          received_quantity: 3,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "execute-import",
          apiId: "IMP-011",
          entityId: importTaskId,
          mutation: true,
          payload: {},
          query: new URLSearchParams(),
          resource: "overseas-import",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({ status: "succeeded" });

    expect(transactionCreate).toHaveBeenCalledTimes(2);
    expect(transactionCreate.mock.calls.map((call) => call[0].data)).toEqual([
      expect.objectContaining({
        direction: "out",
        quantity: 3,
        source_document_type: "overseas_import",
        warehouse_id: TRANSIT_WAREHOUSE_ID,
      }),
      expect.objectContaining({
        direction: "in",
        quantity: 3,
        source_document_type: "overseas_import",
        warehouse_id: OVERSEAS_WAREHOUSE_ID,
      }),
    ]);
  });

  it("serves overseas platform and store inventory view with warehouse scope", async () => {
    const importTaskId = "99999999-9999-4999-8999-999999999999";
    const inventoryRow = {
      available_quantity: 4,
      id: "inventory-overseas-1",
      on_hand_quantity: 5,
      pending_quantity: 0,
      reserved_quantity: 1,
      sku_id: SKU_ID,
      updated_at: new Date("2026-07-26T00:00:00.000Z"),
      warehouse_id: OVERSEAS_WAREHOUSE_ID,
    };
    const storesFindMany = vi.fn().mockResolvedValue([{ id: STORE_ID, platform_id: PLATFORM_ID }]);
    const importTasksFindMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: importTaskId }])
      .mockResolvedValueOnce([
        {
          id: importTaskId,
          stores: {
            ecommerce_platforms: { id: PLATFORM_ID, platform_name: "Amazon" },
            id: STORE_ID,
            store_name: "US Store",
          },
          task_no: "IMP-001",
        },
      ]);
    const transactionFindMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          direction: "in",
          source_document_id: importTaskId,
          source_document_type: "overseas_import",
          sku_id: SKU_ID,
          warehouse_id: OVERSEAS_WAREHOUSE_ID,
        },
      ])
      .mockResolvedValueOnce([
        {
          direction: "in",
          source_document_id: importTaskId,
          source_document_type: "overseas_import",
          transaction_at: new Date("2026-07-26T00:00:00.000Z"),
          sku_id: SKU_ID,
          warehouse_id: OVERSEAS_WAREHOUSE_ID,
        },
      ]);
    const inventoryFindMany = vi
      .fn()
      .mockResolvedValueOnce([inventoryRow])
      .mockResolvedValueOnce([
        {
          available_quantity: 2,
          sku_id: SKU_ID,
          warehouse_id: TRANSIT_WAREHOUSE_ID,
        },
      ]);
    const count = vi.fn().mockResolvedValue(1);
    const client = {
      import_tasks: { findMany: importTasksFindMany },
      inventories: { count, findMany: inventoryFindMany },
      inventory_transactions: { findMany: transactionFindMany },
      stores: { findMany: storesFindMany },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    const result = await repository.execute(
      {
        action: "list",
        apiId: "CBR-017",
        mutation: false,
        payload: {},
        query: new URLSearchParams([
          ["platformId", PLATFORM_ID],
          ["storeId", STORE_ID],
          ["skuId", SKU_ID],
          ["warehouseId", OVERSEAS_WAREHOUSE_ID],
        ]),
        resource: "overseas-inventory",
      },
      {
        ...actor,
        dataScopes: ["warehouse", "store"],
        permissionCodes: ["cross-border.overseas-inventory.read"],
        storeScopes: [{ accessLevel: "read", targetId: STORE_ID }],
        warehouseScopes: [{ accessLevel: "read", targetId: OVERSEAS_WAREHOUSE_ID }],
      },
      context,
    );

    expect(result).toMatchObject({
      items: [
        expect.objectContaining({
          availableQuantity: 4,
          currentQuantity: 5,
          platformId: PLATFORM_ID,
          platformName: "Amazon",
          sourceImportTaskId: importTaskId,
          sourceImportTaskNo: "IMP-001",
          storeId: STORE_ID,
          storeName: "US Store",
          transitQuantity: 2,
        }),
      ],
      total: 1,
    });
    expect(inventoryFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        AND: [
          {
            AND: [
              { warehouses: { id: { in: [OVERSEAS_WAREHOUSE_ID] } } },
              { warehouse_id: OVERSEAS_WAREHOUSE_ID },
              { sku_id: SKU_ID },
              { warehouses: { warehouse_type: "overseas" } },
            ],
          },
          { OR: [{ sku_id: SKU_ID, warehouse_id: OVERSEAS_WAREHOUSE_ID }] },
        ],
      },
    });
  });

  it("returns traceable overseas inventory source chain", async () => {
    const importTaskId = "99999999-9999-4999-8999-999999999999";
    const importItemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const matchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const client = {
      cross_border_shipment_items: { findMany: vi.fn().mockResolvedValue([{ id: ITEM_ID }]) },
      cross_border_shipments: { findMany: vi.fn().mockResolvedValue([{ id: DOCUMENT_ID }]) },
      import_task_items: { findMany: vi.fn().mockResolvedValue([{ id: importItemId }]) },
      import_tasks: { findMany: vi.fn().mockResolvedValue([{ id: importTaskId }]) },
      inventories: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inventory-overseas-1",
          sku_id: SKU_ID,
          warehouse_id: OVERSEAS_WAREHOUSE_ID,
        }),
      },
      inventory_transactions: {
        findMany: vi.fn().mockResolvedValue([
          {
            direction: "in",
            id: "txn-1",
            source_document_id: importTaskId,
            source_document_type: "overseas_import",
            sku_id: SKU_ID,
            warehouse_id: OVERSEAS_WAREHOUSE_ID,
          },
        ]),
      },
      shipment_import_matches: {
        findMany: vi.fn().mockResolvedValue([
          {
            cross_border_shipment_id: DOCUMENT_ID,
            cross_border_shipment_item_id: ITEM_ID,
            id: matchId,
            import_task_id: importTaskId,
            import_task_item_id: importItemId,
          },
        ]),
      },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    await expect(
      repository.execute(
        {
          action: "source-trace",
          apiId: "CBR-022",
          entityId: "inventory-overseas-1",
          mutation: false,
          payload: {},
          query: new URLSearchParams(),
          resource: "overseas-inventory",
        },
        actor,
        context,
      ),
    ).resolves.toMatchObject({
      crossBorderShipmentItems: [{ id: ITEM_ID }],
      crossBorderShipments: [{ id: DOCUMENT_ID }],
      importTaskItems: [{ id: importItemId }],
      importTasks: [{ id: importTaskId }],
      shipmentImportMatches: [{ id: matchId }],
      transactions: [{ id: "txn-1" }],
    });
  });

  it("calculates read-only replenishment suggestions without inventory mutation", async () => {
    const inventoryFindMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          available_quantity: 0,
          id: "inventory-zero",
          on_hand_quantity: 0,
          pending_quantity: 0,
          reserved_quantity: 0,
          sku_id: SKU_ID,
          warehouse_id: OVERSEAS_WAREHOUSE_ID,
        },
        {
          available_quantity: 3,
          id: "inventory-low",
          on_hand_quantity: 3,
          pending_quantity: 0,
          reserved_quantity: 0,
          sku_id: SECOND_SKU_ID,
          warehouse_id: OVERSEAS_WAREHOUSE_ID,
        },
      ])
      .mockResolvedValueOnce([{ available_quantity: 1, sku_id: SECOND_SKU_ID }]);
    const client = {
      inventories: { findMany: inventoryFindMany },
      inventory_transactions: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new PrismaInventoryWorkflowRepository(client as unknown as PrismaClient);

    const result = await repository.execute(
      {
        action: "summary",
        apiId: "CBR-016",
        mutation: false,
        payload: {},
        query: new URLSearchParams([
          ["view", "replenishment"],
          ["lowStockThreshold", "5"],
        ]),
        resource: "overseas-inventory",
      },
      actor,
      context,
    );

    expect(result).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ readOnly: true, suggestionType: "zero_stock" }),
        expect.objectContaining({
          coverageQuantity: 4,
          readOnly: true,
          suggestionType: "low_stock",
          suggestedQuantity: 1,
        }),
      ]),
      readOnly: true,
      totalCandidates: 2,
    });
    expect(client.inventories as { create?: unknown; update?: unknown; upsert?: unknown }).toEqual(
      expect.not.objectContaining({
        create: expect.anything(),
        update: expect.anything(),
        upsert: expect.anything(),
      }),
    );
  });
});
