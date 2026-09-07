import { describe, expect, it, vi } from "vitest";
import {
  assertPurchaseDeleteState,
  isUatPurchaseOrder,
  matchWorkflowEndpoint,
  WorkflowService,
  InMemoryAuditWriter,
  type AuthenticationContext,
} from "../src/index";

const id = "11111111-1111-4111-8111-111111111111";
const auth: AuthenticationContext = {
  user: {
    userId: id,
    username: "uat",
    roleCodes: ["administrator"],
    dataScopes: ["all"],
    permissionCodes: ["purchase.order.cancel"],
  },
};
const context = { requestId: id, timestamp: new Date().toISOString() };
describe("CR-006 purchase deletion", () => {
  it.each(["UAT-003A-test", "UAT-DELETE:test", " UAT-003A 采购 "])(
    "recognizes anchored marker %s",
    (remark) => {
      expect(isUatPurchaseOrder({ remark })).toBe(true);
    },
  );
  it.each(["正常订单 UAT-003A", "测试订单", "uat-003a", "UAT-", "UAT-003A中文"])(
    "rejects ambiguous marker %s",
    (remark) => {
      expect(isUatPurchaseOrder({ remark })).toBe(false);
    },
  );
  it("allows draft and only administrator UAT cancelled", () => {
    expect(() => assertPurchaseDeleteState({ status: "draft" }, false)).not.toThrow();
    expect(() =>
      assertPurchaseDeleteState({ status: "cancelled", remark: "UAT-003A" }, true),
    ).not.toThrow();
    expect(() =>
      assertPurchaseDeleteState({ status: "cancelled", remark: "UAT-003A" }, false),
    ).toThrow("仅管理员");
    expect(() =>
      assertPurchaseDeleteState({ status: "cancelled", remark: "正式订单" }, true),
    ).toThrow("当前状态");
  });
  it.each(["pending_approval", "approved", "in_progress", "completed", "voided", "rejected"])(
    "rejects state %s",
    (status) => {
      expect(() => assertPurchaseDeleteState({ status, remark: "UAT-003A" }, true)).toThrow(
        "当前状态",
      );
    },
  );
  it("registers existing path DELETE with cancel permission and prevents permission argument bypass", async () => {
    const endpoint = matchWorkflowEndpoint(
      "DELETE",
      ["purchase-orders", id],
      new URLSearchParams(),
      {},
    )!;
    expect(endpoint).toMatchObject({
      permission: "purchase.order.cancel",
      command: { apiId: "PUR-030", action: "delete", entityId: id },
    });
    const repo = { execute: vi.fn(), deletePurchase: vi.fn() };
    const service = new WorkflowService(repo, new InMemoryAuditWriter());
    await expect(
      service.execute(
        endpoint.command,
        "purchase.order.read",
        { user: { ...auth.user, permissionCodes: ["purchase.order.read"] } },
        context,
      ),
    ).rejects.toMatchObject({ httpStatus: 403 });
    expect(repo.deletePurchase).not.toHaveBeenCalled();
  });
  it("writes required audit only through the repository transaction callback", async () => {
    const transactional = new InMemoryAuditWriter();
    const outer = new InMemoryAuditWriter();
    const write = vi.spyOn(transactional, "write");
    const outside = vi.spyOn(outer, "write");
    const service = new WorkflowService(
      {
        execute: vi.fn(),
        deletePurchase: async (target, _actor, audit) => {
          await audit(transactional, {
            id: target,
            document_no: "UAT-003A",
            purchase_order_items: [],
          });
          return { id: target, deleted: true };
        },
      },
      outer,
    );
    const endpoint = matchWorkflowEndpoint(
      "DELETE",
      ["purchase-orders", id],
      new URLSearchParams(),
      {},
    )!;
    await expect(
      service.execute(endpoint.command, endpoint.permission, auth, context),
    ).resolves.toEqual({ id, deleted: true });
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: id,
        action: "PUR-030",
        beforeSnapshot: expect.objectContaining({ document_no: "UAT-003A" }),
      }),
    );
    expect(outside).not.toHaveBeenCalled();
    write.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(
      service.execute(endpoint.command, endpoint.permission, auth, context),
    ).rejects.toMatchObject({ httpStatus: 503 });
  });
});
