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
