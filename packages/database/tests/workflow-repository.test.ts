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
});
