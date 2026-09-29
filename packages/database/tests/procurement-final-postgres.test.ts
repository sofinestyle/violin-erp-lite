import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaWorkflowRepository,
} from "../src/index";
import type { PrismaClient } from "../src/generated/prisma/client";
const enabled = process.env.RUN_PROCUREMENT_FINAL_POSTGRES === "1";
const db = enabled ? createPrismaClient(process.env.DATABASE_URL!) : null;
afterAll(async () => {
  await db?.$disconnect();
});
describe.skipIf(!enabled)("CR-013 real local PostgreSQL and HTTP", () => {
  it("commits once, replays idempotently, rejects boundaries and rolls back Audit/ledger failures", async () => {
    let token = "";
    async function api(path: string, method = "GET", body?: unknown, key = randomUUID()) {
      const response = await fetch(`http://localhost:3100/api/v1/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Client-Type": "pc",
          "Idempotency-Key": key,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { http: response.status, ...(await response.json()) } as {
        http: number;
        success: boolean;
        data: Record<string, unknown>;
      };
    }
    const auth = await api("auth/login", "POST", {
      loginType: "password",
      username: process.env.CODE_GENERATION_UAT_USERNAME,
      password: process.env.CODE_GENERATION_UAT_PASSWORD,
    });
    expect(auth.http).toBe(200);
    token = String(auth.data.accessToken);
    const client = db!;
    const sku = await client.skus.findFirstOrThrow({
      where: { sku_code: { startsWith: "UAT-" }, is_active: true },
    });
    const supplier = await client.suppliers.findFirstOrThrow({
      where: { supplier_name: { startsWith: "UAT-" }, is_active: true },
    });
    const warehouse = await api("warehouses", "POST", {
      warehouseName: `UAT-PROC-FINAL-PG-${Date.now()}`,
      warehouseType: "company",
      ownerType: "company",
      allowsAvailableStock: true,
      sortOrder: 99,
    });
    expect(warehouse.http).toBe(201);
    const po = await api("purchase-orders", "POST", {
      documentDate: "2026-09-29",
      expectedDeliveryDate: "2026-09-30",
      supplierId: supplier.id,
      remark: "UAT-PROC-FINAL-PG",
      items: [{ skuId: sku.id, quantity: 2, unitPrice: 123.45, taxRate: 0 }],
    });
    expect(po.http).toBe(201);
    const id = String(po.data.id);
    const source = await client.purchase_orders.findUniqueOrThrow({
      where: { id },
      include: { purchase_order_items: true },
    });
    const actor = (await createCurrentUserResolver(client)(source.created_by))!;
    const payload = {
      purchaseOrderId: id,
      warehouseId: warehouse.data.id,
      documentDate: "2026-09-29",
      inspectionPerformed: false,
      inspectorName: "必须清空",
      items: [
        {
          purchaseOrderItemId: source.purchase_order_items[0]!.id,
          skuId: sku.id,
          quantity: 2,
          unitCost: 999,
          batchNo: "not-a-business-batch",
        },
      ],
    };
    expect((await api("inbound-orders/purchase", "POST", payload)).http).toBe(409);
    expect(
      (await api(`purchase-orders/${id}/approve`, "POST", { versionNo: po.data.versionNo })).http,
    ).toBe(200);
    expect(
      (await api("inbound-orders/purchase", "POST", { ...payload, inspectionPerformed: undefined }))
        .http,
    ).toBe(422);
    for (const quantity of [1, 3])
      expect(
        (
          await api("inbound-orders/purchase", "POST", {
            ...payload,
            items: [{ ...payload.items[0], quantity }],
          })
        ).http,
      ).toBe(422);
    const command = {
      resource: "inbound" as const,
      action: "create-purchase",
      apiId: "INB-003",
      mutation: true,
      payload,
      query: new URLSearchParams(),
    };
    const repo = new PrismaWorkflowRepository(client);
    await expect(
      repo.executeAtomicProcurement(command, actor, async () => {
        throw Error("UAT_AUDIT_FAILURE");
      }),
    ).rejects.toThrow("UAT_AUDIT_FAILURE");
    expect(await client.inbound_orders.count({ where: { source_document_id: id } })).toBe(0);
    expect(
      await client.inventories.count({ where: { warehouse_id: String(warehouse.data.id) } }),
    ).toBe(0);
    expect((await client.purchase_orders.findUniqueOrThrow({ where: { id } })).status).toBe(
      "purchasing",
    );
    const failingClient = new Proxy(client, {
      get(target, key) {
        if (key === "$transaction")
          return (work: (tx: unknown) => Promise<unknown>, options: object) =>
            target.$transaction(
              (tx) =>
                work(
                  new Proxy(tx, {
                    get(t, k) {
                      if (k === "inventory_transactions")
                        return {
                          ...t.inventory_transactions,
                          create: async () => {
                            throw Error("UAT_LEDGER_FAILURE");
                          },
                        };
                      return Reflect.get(t, k);
                    },
                  }),
                ),
              options,
            );
        return Reflect.get(target, key);
      },
    });
    await expect(
      new PrismaWorkflowRepository(failingClient as PrismaClient).executeAtomicProcurement(
        command,
        actor,
        async () => {},
      ),
    ).rejects.toThrow("UAT_LEDGER_FAILURE");
    expect(await client.inbound_orders.count({ where: { source_document_id: id } })).toBe(0);
    expect(
      await client.inventories.count({ where: { warehouse_id: String(warehouse.data.id) } }),
    ).toBe(0);
    const cancelled = await client.purchase_orders.findFirst({
      where: { status: "cancelled", created_by: actor.userId },
    });
    expect(cancelled).not.toBeNull();
    expect(
      (await api("inbound-orders/purchase", "POST", { ...payload, purchaseOrderId: cancelled!.id }))
        .http,
    ).toBe(409);
    const key = randomUUID();
    const secondKey = randomUUID();
    const [one, two] = await Promise.all([
      api("inbound-orders/purchase", "POST", payload, key),
      api("inbound-orders/purchase", "POST", payload, secondKey),
    ]);
    expect([one.http, two.http].sort()).toEqual([201, 409]);
    const winner = one.http === 201 ? one : two;
    const replay = await api(
      "inbound-orders/purchase",
      "POST",
      payload,
      one.http === 201 ? key : secondKey,
    );
    expect(replay.http).toBe(201);
    expect(replay.data.id).toBe(winner.data.id);
    expect(await client.inbound_orders.count({ where: { source_document_id: id } })).toBe(1);
    const inbound = await client.inbound_orders.findUniqueOrThrow({
      where: { id: String(winner.data.id) },
      include: { inbound_order_items: true },
    });
    expect(inbound.inspector_name).toBeNull();
    expect(inbound.inspection_performed).toBe(false);
    expect(inbound.status).toBe("completed");
    expect(Number(inbound.inbound_order_items[0]!.unit_cost)).toBe(123.45);
    expect(inbound.inbound_order_items[0]!.batch_no).toBeNull();
    expect(
      await client.inventory_transactions.count({ where: { source_document_id: inbound.id } }),
    ).toBe(1);
    expect(
      await client.audit_logs.count({ where: { object_id: inbound.id, action_code: "INB-003" } }),
    ).toBe(1);
    expect(
      Number(
        (
          await client.inventories.findFirstOrThrow({
            where: { warehouse_id: String(warehouse.data.id) },
          })
        ).on_hand_quantity,
      ),
    ).toBe(2);
    expect((await api(`purchase-orders/${id}`)).data.businessStatus).toBe("received");
    expect((await api(`purchase-orders/${id}/payments`, "POST", {})).http).toBe(409);
    expect((await api("inspection-orders", "POST", { sourceType: "purchase" })).http).toBe(409);
  }, 60000);
});
