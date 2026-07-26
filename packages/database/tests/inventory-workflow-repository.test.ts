import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, InventoryWorkflowCommand, RequestContext } from "@violin-erp/api";
import { applyInventoryMovements, PrismaInventoryWorkflowRepository } from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";
const SOURCE_WAREHOUSE_ID = "55555555-5555-4555-8555-555555555555";
const TRANSIT_WAREHOUSE_ID = "66666666-6666-4666-8666-666666666666";
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
});
