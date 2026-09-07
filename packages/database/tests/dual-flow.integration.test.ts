import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MasterDataService,
  WorkflowService,
  matchWorkflowEndpoint,
  type AuthenticationContext,
} from "@violin-erp/api";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaAuditWriter,
  PrismaMasterDataRepository,
  PrismaWorkflowRepository,
} from "../src/index";

// Explicit opt-in: real UAT records are retained and labelled, never reset/seed/delete.
const databaseUrl = process.env.DUAL_FLOW_INTEGRATION_DATABASE_URL;
type Row = Record<string, unknown> & { id: string };
const tag = `UAT-DUAL-${randomUUID().slice(0, 8).toUpperCase()}`;
const today = new Date().toISOString().slice(0, 10);

describe
  .skipIf(!databaseUrl)
  .sequential("Real Prisma independent procurement and production flows", () => {
    let db: ReturnType<typeof createPrismaClient>;
    let workflow: WorkflowService;
    let master: MasterDataService;
    let creator: AuthenticationContext;
    let reviewer: AuthenticationContext;
    let supplier: Row;
    let manufacturer: Row;
    let warehouse: Row;
    let productionSku: Row;
    let purchaseSku: Row;
    let production: Row;
    let purchase: Row;
    let productionInspection: Row;
    let purchaseInspection: Row;
    const requests: { id: string; requestId: string }[] = [];
    const context = () => ({ requestId: randomUUID(), timestamp: new Date().toISOString() });

    beforeAll(async () => {
      const target = new URL(databaseUrl!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
        target.pathname !== "/violin_erp_lite"
      )
        throw new Error("Only the explicitly approved local UAT database is allowed");
      db = createPrismaClient(databaseUrl!);
      const admin = await db.users.findFirstOrThrow({
        where: { username: "dev-admin", is_active: true },
      });
      const approver = await db.users.findFirstOrThrow({
        where: { username: "uat-003a-approver", is_active: true },
      });
      const principal = await createCurrentUserResolver(db)(admin.id);
      if (!principal) throw new Error("Local administrator is unavailable");
      creator = { user: principal };
      // Test-only authenticated reviewer context, using an existing real user ID for FK/audit.
      // No database roles/permissions are assigned or changed; HTTP authentication is tested separately.
      reviewer = { user: { ...principal, userId: approver.id, username: approver.username } };
      const audit = new PrismaAuditWriter(db);
      workflow = new WorkflowService(new PrismaWorkflowRepository(db), audit);
      master = new MasterDataService(new PrismaMasterDataRepository(db), audit);
      const category = await db.product_categories.findFirstOrThrow({ where: { is_active: true } });
      const brand = await db.brands.findFirstOrThrow({ where: { is_active: true } });
      const product = await master.create(
        "products",
        {
          productName: `${tag}-独立双链小提琴`,
          productNameEn: tag,
          productType: "violin",
          categoryId: category.id,
          brandId: brand.id,
          defaultUnit: "把",
        },
        creator,
        context(),
      );
      productionSku = await master.create(
        "skus",
        {
          productId: product.id,
          skuName: `${tag}-生产黑色`,
          size: "4/4",
          color: "黑色",
          unit: "把",
          safetyStockQuantity: 0,
        },
        creator,
        context(),
      );
      purchaseSku = await master.create(
        "skus",
        {
          productId: product.id,
          skuName: `${tag}-采购棕色`,
          size: "4/4",
          color: "棕色",
          unit: "把",
          safetyStockQuantity: 0,
        },
        creator,
        context(),
      );
      supplier = await master.create(
        "suppliers",
        { supplierName: `${tag}-供应商`, settlementMethod: "cash" },
        creator,
        context(),
      );
      manufacturer = await master.create(
        "manufacturers",
        { manufacturerName: `${tag}-厂家`, settlementMethod: "cash" },
        creator,
        context(),
      );
      warehouse = await master.create(
        "warehouses",
        {
          warehouseName: `${tag}-成品仓`,
          warehouseType: "company",
          ownerType: "company",
          allowsAvailableStock: true,
          sortOrder: 0,
        },
        creator,
        context(),
      );
    }, 30_000);

    afterAll(async () => {
      await db?.$disconnect();
    });

    async function call(
      method: string,
      path: string,
      payload: Record<string, unknown> = {},
      authentication = creator,
    ): Promise<Row> {
      const endpoint = matchWorkflowEndpoint(
        method,
        path.split("/"),
        new URLSearchParams(),
        payload,
      );
      if (!endpoint) throw new Error(`Missing existing endpoint ${method} ${path}`);
      const request = context();
      const result = (await workflow.execute(
        endpoint.command,
        endpoint.permission,
        authentication,
        request,
      )) as Row;
      if (endpoint.command.mutation) requests.push({ id: result.id, requestId: request.requestId });
      return result;
    }

    async function action(path: string, name: string, authentication = creator) {
      const record = await call("GET", path);
      await call(
        "POST",
        `${path}/${name}`,
        {
          versionNo: record.versionNo,
          ...(name === "start"
            ? { actualStartDate: today, progressDescription: `${tag}-直接开工` }
            : {}),
        },
        authentication,
      );
      // State-action responses are not detail DTOs; reload through the official GET endpoint.
      return call("GET", path);
    }

    async function inspect(
      type: "purchase" | "production",
      order: Row,
      sku: Row,
      qualified: number,
    ) {
      const field = type === "purchase" ? "purchaseOrderId" : "productionOrderId";
      const relation = type === "purchase" ? "purchaseOrderItems" : "productionOrderItems";
      const item = (order[relation] as Row[])[0]!;
      const inspection = await call("POST", "inspection-orders", {
        sourceType: type,
        [field]: order.id,
        inspectionDate: today,
        inspectionWarehouseId: warehouse.id,
        inspectorId: creator.user.userId,
        remark: tag,
        unqualifiedDisposition: "不合格品隔离，不入库",
        items: [
          {
            sourceItemId: item.id,
            skuId: sku.id,
            inspectedQuantity: 100,
            qualifiedQuantity: qualified,
            unqualifiedQuantity: 100 - qualified,
            inspectionResult: "unqualified",
            defectDescription: "UAT模拟外观瑕疵",
            dispositionMethod: "隔离",
          },
        ],
      });
      expect(inspection.sourceType).toBe(type);
      expect(inspection[field]).toBe(order.id);
      await action(`inspection-orders/${inspection.id}`, "submit");
      const confirmed = await action(`inspection-orders/${inspection.id}`, "confirm");
      expect(confirmed.status).toBe("confirmed");
      expect(await db.inventories.count({ where: { sku_id: sku.id } })).toBe(0);
      return confirmed;
    }

    async function inbound(
      type: "purchase" | "production",
      order: Row,
      inspection: Row,
      sku: Row,
      quantity: number,
    ) {
      const field = type === "purchase" ? "purchaseOrderId" : "productionOrderId";
      const itemField = type === "purchase" ? "purchaseOrderItemId" : "productionOrderItemId";
      const inspectionItem = (inspection.inspectionOrderItems as Row[])[0]!;
      const record = await call("POST", `inbound-orders/${type}`, {
        [field]: order.id,
        inspectionOrderId: inspection.id,
        warehouseId: warehouse.id,
        documentDate: today,
        remark: tag,
        items: [
          {
            [itemField]: inspectionItem.sourceItemId,
            inspectionOrderItemId: inspectionItem.id,
            skuId: sku.id,
            quantity,
            unitCost: 100,
            batchNo: tag,
            inventoryCondition: "qualified",
          },
        ],
      });
      expect(record.sourceDocumentType).toBe(`${type}_order`);
      expect(record.sourceDocumentId).toBe(order.id);
      await action(`inbound-orders/${record.id}`, "submit");
      await action(`inbound-orders/${record.id}`, "approve", reviewer);
      expect(await db.inventories.count({ where: { sku_id: sku.id } })).toBe(0);
      const completed = await action(`inbound-orders/${record.id}`, "confirm");
      expect(completed.status).toBe("completed");
      const stock = await db.inventories.findFirstOrThrow({
        where: { sku_id: sku.id, warehouse_id: warehouse.id },
      });
      expect(Number(stock.on_hand_quantity)).toBe(quantity);
      expect(Number(stock.available_quantity)).toBe(quantity);
      expect(Number(stock.reserved_quantity)).toBe(0);
      expect(Number(stock.pending_quantity)).toBe(0);
      const ledger = await db.inventory_transactions.findMany({ where: { sku_id: sku.id } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.source_document_type).toBe("inbound_order");
      expect(ledger[0]?.source_document_id).toBe(record.id);
      expect(Number(ledger[0]?.quantity_before)).toBe(0);
      expect(Number(ledger[0]?.quantity_after)).toBe(quantity);
      expect(Number(ledger[0]?.quantity)).toBe(quantity);
      await expect(action(`inbound-orders/${record.id}`, "confirm")).rejects.toBeDefined();
      expect(await db.inventory_transactions.count({ where: { sku_id: sku.id } })).toBe(1);
      console.info(
        JSON.stringify({
          tag,
          flow: type,
          order: order.documentNo,
          inspection: inspection.documentNo,
          inbound: record.documentNo,
          sku: sku.skuCode,
          quantity,
          transaction: ledger[0]?.transaction_no,
        }),
      );
      return completed;
    }

    it("runs production FIRST without creating any purchase order, completes 100, inspects 97/3, stocks +97", async () => {
      const before = await db.purchase_orders.count();
      production = await call("POST", "production-orders", {
        documentDate: today,
        manufacturerId: manufacturer.id,
        plannedStartDate: today,
        expectedCompletionDate: today,
        remark: tag,
        items: [{ skuId: productionSku.id, plannedQuantity: 100, processingUnitPrice: 100 }],
      });
      expect(production.status).toBe("draft");
      expect(production.purchaseOrderId).toBeUndefined();
      await action(`production-orders/${production.id}`, "submit");
      await action(`production-orders/${production.id}`, "approve", reviewer);
      production = await action(`production-orders/${production.id}`, "start");
      const item = (production.productionOrderItems as Row[])[0]!;
      const completion = await call(
        "POST",
        `production-orders/${production.id}/completion-records`,
        {
          completionBatchNo: tag,
          completionDate: today,
          warehouseId: warehouse.id,
          productionOrderVersionNo: production.versionNo,
          remark: tag,
          items: [
            {
              productionOrderItemId: item.id,
              skuId: productionSku.id,
              completedQuantity: 100,
              batchNo: tag,
            },
          ],
        },
      );
      await call("POST", `production-completion-records/${completion.id}/confirm`, {
        productionOrderVersionNo: production.versionNo,
      });
      production = await call("GET", `production-orders/${production.id}`);
      expect(production.status).toBe("completed");
      expect(Number((production.productionOrderItems as Row[])[0]?.completedQuantity)).toBe(100);
      productionInspection = await inspect("production", production, productionSku, 97);
      await inbound("production", production, productionInspection, productionSku, 97);
      expect(await db.purchase_orders.count()).toBe(before);
    }, 30_000);

    it("runs purchase without production references, inspects 98/2 and stocks +98", async () => {
      const before = await db.production_orders.count();
      purchase = await call("POST", "purchase-orders", {
        documentDate: today,
        supplierId: supplier.id,
        expectedDeliveryDate: today,
        settlementMethod: "cash",
        remark: tag,
        items: [{ skuId: purchaseSku.id, quantity: 100, unitPrice: 100, taxRate: 0 }],
      });
      expect(purchase.status).toBe("draft");
      await action(`purchase-orders/${purchase.id}`, "submit");
      purchase = await action(`purchase-orders/${purchase.id}`, "approve", reviewer);
      purchaseInspection = await inspect("purchase", purchase, purchaseSku, 98);
      await inbound("purchase", purchase, purchaseInspection, purchaseSku, 98);
      expect(await db.production_orders.count()).toBe(before);
    }, 30_000);

    it("rejects cross-chain inspection/inbound, preserves ledger, writes real audit for every successful action", async () => {
      expect(purchaseInspection).toBeDefined();
      expect(productionInspection).toBeDefined();
      for (const [type, wrongField, order] of [
        ["purchase", "productionOrderId", production],
        ["production", "purchaseOrderId", purchase],
      ] as const) {
        await expect(
          call("POST", "inspection-orders", {
            sourceType: type,
            [wrongField]: order.id,
            inspectionDate: today,
            inspectionWarehouseId: warehouse.id,
            inspectorId: creator.user.userId,
            items: [{}],
          }),
        ).rejects.toBeDefined();
      }
      for (const [type, field, order, wrongInspection] of [
        ["purchase", "purchaseOrderId", purchase, productionInspection],
        ["production", "productionOrderId", production, purchaseInspection],
      ] as const) {
        await expect(
          call("POST", `inbound-orders/${type}`, {
            [field]: order.id,
            inspectionOrderId: wrongInspection.id,
            warehouseId: warehouse.id,
            documentDate: today,
            items: [{}],
          }),
        ).rejects.toBeDefined();
      }
      expect(
        await db.inventory_transactions.count({
          where: { sku_id: { in: [productionSku.id, purchaseSku.id] } },
        }),
      ).toBe(2);
      for (const request of requests) {
        expect(
          await db.audit_logs.count({
            where: {
              object_id: request.id,
              request_trace_id: request.requestId,
              operation_result: "success",
            },
          }),
        ).toBe(1);
      }
      console.info(
        JSON.stringify({
          tag,
          successfulWorkflowAudits: requests.length,
          crossChainRejections: 4,
          retainedUatData: true,
        }),
      );
    }, 30_000);
  });
