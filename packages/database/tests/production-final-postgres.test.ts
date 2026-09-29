import type { PrismaClient } from "../src/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaWorkflowRepository,
} from "../src/index";
const enabled = process.env.RUN_PRODUCTION_FINAL_POSTGRES === "1";
const db = enabled ? createPrismaClient(process.env.DATABASE_URL!) : null;
afterAll(async () => {
  await db?.$disconnect();
});
describe.skipIf(!enabled)("CR-014 real production partial inbound", () => {
  it("multi-SKU three batches, cost, concurrency, idempotency, boundaries and atomic rollback", async () => {
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
        data: Record<string, unknown>;
        error?: { message: string };
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
    const skus = await client.skus.findMany({
      where: { is_active: true, sku_code: { startsWith: "UAT-" } },
      take: 2,
    });
    expect(skus.length).toBe(2);
    const manufacturer = await client.manufacturers.findFirstOrThrow({
      where: { is_active: true, manufacturer_name: { startsWith: "UAT-" } },
    });
    const warehouse = await api("warehouses", "POST", {
      warehouseName: `UAT-PROD-FINAL-${Date.now()}`,
      warehouseType: "company",
      ownerType: "company",
      allowsAvailableStock: true,
      sortOrder: 99,
    });
    expect(warehouse.http).toBe(201);
    const make = () =>
      api("production-orders", "POST", {
        documentDate: "2026-09-29",
        expectedCompletionDate: "2026-10-10",
        manufacturerId: manufacturer.id,
        remark: "UAT-PROD-FINAL-PG",
        items: skus.map((s, i) => ({
          skuId: s.id,
          plannedQuantity: i ? 50 : 100,
          processingUnitPrice: i ? 200 : 123.45,
        })),
      });
    const created = await make();
    expect(created.http, created.error?.message).toBe(201);
    const id = String(created.data.id);
    const order = await client.production_orders.findUniqueOrThrow({
      where: { id },
      include: { production_order_items: { orderBy: { line_no: "asc" } } },
    });
    expect(order.status).toBe("in_production");
    expect(order.planned_start_date).toEqual(order.document_date);
    const actor = (await createCurrentUserResolver(client)(order.created_by))!;
    const payload = (a: number, b = 0, performed = true) => ({
      documentDate: "2026-09-29",
      productionOrderId: id,
      warehouseId: warehouse.data.id,
      inspectionPerformed: performed,
      inspectorName: "张三",
      items: order.production_order_items.flatMap((item, i) =>
        (i ? b : a) > 0
          ? [
              {
                productionOrderItemId: item.id,
                skuId: item.sku_id,
                quantity: i ? b : a,
                unitCost: 999,
                batchNo: "fake",
              },
            ]
          : [],
      ),
    });
    const command = {
      action: "create-production",
      apiId: "INB-004" as const,
      mutation: true,
      resource: "inbound" as const,
      query: new URLSearchParams(),
      payload: payload(40, 50),
    };
    await expect(
      new PrismaWorkflowRepository(client).executeAtomicProcurement(command, actor, async () => {
        throw Error("UAT_AUDIT_FAILURE");
      }),
    ).rejects.toThrow("UAT_AUDIT_FAILURE");
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
    await expect(
      new PrismaWorkflowRepository(client).executeAtomicProcurement(
        command,
        { ...actor, dataScopes: ["self_created"], warehouseScopes: [] },
        async () => {},
      ),
    ).rejects.toThrow("目标仓库");

    expect(await client.inbound_orders.count({ where: { source_document_id: id } })).toBe(0);
    expect(
      await client.inventories.count({ where: { warehouse_id: String(warehouse.data.id) } }),
    ).toBe(0);
    await expect(
      new PrismaWorkflowRepository(client).executeAtomicProcurement(
        command,
        { ...actor, dataScopes: ["self_created"], userId: randomUUID() },
        async () => {},
      ),
    ).rejects.toThrow();
    expect(
      (
        await api("inbound-orders/production", "POST", {
          ...payload(1),
          inspectionPerformed: undefined,
        })
      ).http,
    ).toBe(422);
    expect((await api("inbound-orders/production", "POST", payload(101))).http).toBe(422);
    const first = await api("inbound-orders/production", "POST", payload(40, 50));
    expect(first.http, first.error?.message).toBe(201);
    expect((await api(`production-orders/${id}`)).data.businessStatus).toBe("partially_received");
    const second = await api("inbound-orders/production", "POST", payload(30, 0, false));
    expect(second.http).toBe(201);
    const stored = await client.inbound_orders.findUniqueOrThrow({
      where: { id: String(second.data.id) },
    });
    expect(stored.inspector_name).toBeNull();
    const key1 = randomUUID(),
      key2 = randomUUID();
    const [one, two] = await Promise.all([
      api("inbound-orders/production", "POST", payload(30), key1),
      api("inbound-orders/production", "POST", payload(30), key2),
    ]);
    expect([one.http, two.http].sort()).toEqual([201, 409]);
    const winner = one.http === 201 ? one : two;
    const replay = await api(
      "inbound-orders/production",
      "POST",
      payload(30),
      one.http === 201 ? key1 : key2,
    );
    expect(replay.http).toBe(201);
    expect(replay.data.id).toBe(winner.data.id);
    expect((await api(`production-orders/${id}`)).data.businessStatus).toBe("received");
    expect((await api("inbound-orders/production", "POST", payload(1))).http).toBe(409);
    const inbounds = await client.inbound_orders.findMany({
      where: { source_document_id: id },
      include: { inbound_order_items: true },
    });
    expect(inbounds).toHaveLength(3);
    for (const inbound of inbounds) {
      expect(inbound.status).toBe("completed");
      expect(
        await client.audit_logs.count({
          where: { object_id: inbound.id, action_code: "INB-004", operation_result: "success" },
        }),
      ).toBe(1);
      for (const line of inbound.inbound_order_items) {
        expect(Number(line.unit_cost)).toBe(line.sku_id === skus[0]!.id ? 123.45 : 200);
        expect(line.batch_no).toBeNull();
      }
    }
    for (let i = 0; i < 2; i++) {
      const stock = await client.inventories.findFirstOrThrow({
        where: { warehouse_id: String(warehouse.data.id), sku_id: skus[i]!.id },
      });
      expect(Number(stock.on_hand_quantity)).toBe(i ? 50 : 100);
      expect(Number(stock.available_quantity)).toBe(i ? 50 : 100);
    }
    const ledger = await client.inventory_transactions.findMany({
      where: { source_document_id: { in: inbounds.map((i) => i.id) } },
    });
    expect(ledger).toHaveLength(4);
    expect(ledger.reduce((s, t) => s + Number(t.amount), 0)).toBe(22345);
    expect(
      await client.audit_logs.count({ where: { object_id: id, action_code: "PRO-003" } }),
    ).toBe(1);
    const cancelled = await make();
    expect(cancelled.http).toBe(201);
    expect(
      (
        await api(`production-orders/${cancelled.data.id}/cancel`, "POST", {
          versionNo: 1,
          reason: "UAT取消负向测试",
        })
      ).http,
    ).toBe(200);
    expect(
      (
        await api("inbound-orders/production", "POST", {
          ...payload(1),
          productionOrderId: cancelled.data.id,
        })
      ).http,
    ).toBe(409);
    expect((await api(`production-orders/${id}/progress-records`, "POST", {})).http).toBe(409);
    expect((await api(`production-orders/${id}/completion-records`, "POST", {})).http).toBe(409);
    expect((await api("inspection-orders", "POST", { sourceType: "production" })).http).toBe(409);
    expect((await api(`production-orders/${id}/progress-records`)).http).toBe(200);
    console.log(
      JSON.stringify({
        productionOrder: order.document_no,
        inbounds: inbounds.map((i) => i.document_no),
        stockA: 100,
        stockB: 50,
        ledgerCount: ledger.length,
        totalEstimatedCost: 22345,
      }),
    );
  }, 60000);
});
