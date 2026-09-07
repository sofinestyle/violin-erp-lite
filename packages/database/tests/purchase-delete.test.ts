import { describe, expect, it, vi } from "vitest";
import { purchaseDelete } from "../src/workflow/prisma-purchase-delete";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import type { AuthenticatedUser } from "@violin-erp/api";

const id = "11111111-1111-4111-8111-111111111111";
const actor: AuthenticatedUser = {
  userId: id,
  username: "uat",
  roleCodes: ["administrator"],
  dataScopes: ["all"],
  permissionCodes: ["purchase.order.cancel"],
};
const refs = [
  "purchase_payments",
  "purchase_returns",
  "purchase_return_items",
  "inspection_orders",
  "inbound_orders",
  "inventory_transactions",
  "damage_reports",
  "attachment_links",
  "approval_records",
];
function fixture() {
  const order = {
    id,
    created_by: id,
    document_no: "UAT-DELETE",
    status: "draft",
    paid_amount: new Prisma.Decimal(0),
    purchase_order_items: [],
  };
  const tx = {
    ...Object.fromEntries(refs.map((name) => [name, { count: vi.fn().mockResolvedValue(0) }])),
    $queryRaw: vi.fn().mockResolvedValue([{ id }]),
    purchase_orders: {
      findUnique: vi.fn().mockResolvedValue(order),
      delete: vi.fn().mockResolvedValue(order),
    },
  };
  const client = {
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  return { tx, client };
}
describe("Purchase reference and FK guards", () => {
  it.each(refs)("blocks any %s row without lifecycle filtering", async (name) => {
    const { tx, client } = fixture();
    const reference = (tx as unknown as Record<string, { count: ReturnType<typeof vi.fn> }>)[name]!;
    reference.count.mockResolvedValue(1);
    const audit = vi.fn();
    await expect(purchaseDelete(client)(id, actor, audit)).rejects.toThrow("后续业务记录");
    expect(tx.purchase_orders.delete).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(JSON.stringify(reference.count.mock.calls)).not.toMatch(/status|active/);
  });
  it("maps final FK race to business conflict without success audit", async () => {
    const { tx, client } = fixture();
    tx.purchase_orders.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK SQL detail", {
        code: "P2003",
        clientVersion: "test",
      }),
    );
    const audit = vi.fn();
    await expect(purchaseDelete(client)(id, actor, audit)).rejects.toMatchObject({
      code: "CONFLICT_REQUEST",
      message: "该采购订单已产生后续业务记录，无法删除。",
    });
    expect(audit).not.toHaveBeenCalled();
  });
});
