// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PurchaseInboundForm } from "@/components/workflow/purchase-inbound-experience";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("purchase inbound explicit inspection interaction", () => {
  it("retains an asynchronous selected order, requires a choice, clears stale inspector and submits authoritative references", async () => {
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    const save = vi.fn();
    const props = {
      initialOrderId: "po",
      warehouses: [{ value: "wh", label: "UAT仓库", raw: {} }],
      saving: false,
      error: null,
      onCancel: () => {},
      onSave: save,
    };
    await act(async () => root.render(<PurchaseInboundForm {...props} orders={[]} />));
    await act(async () =>
      root.render(
        <PurchaseInboundForm
          {...props}
          orders={[
            {
              value: "po",
              label: "PO-UAT",
              raw: {
                businessStatus: "purchasing",
                purchaseOrderItems: [
                  {
                    id: "line",
                    skuId: "sku",
                    skuCodeSnapshot: "UAT-SKU",
                    quantity: 10,
                    inboundQuantity: 0,
                    unitPrice: 300,
                  },
                ],
              },
            },
          ]}
        />,
      ),
    );
    expect(element.querySelector<HTMLSelectElement>('[aria-label="采购订单"]')!.value).toBe("po");
    const select = async (label: string, value: string) =>
      act(async () => {
        const field = element.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;
        field.value = value;
        field.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await select("目标仓库", "wh");
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    await select("是否质检", "yes");
    const name = element.querySelector<HTMLInputElement>('[aria-label="质检人"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "张三");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await select("是否质检", "no");
    expect(element.querySelector('[aria-label="质检人"]')).toBeNull();
    await select("是否质检", "yes");
    expect(element.querySelector<HTMLInputElement>('[aria-label="质检人"]')!.value).toBe("");
    await select("是否质检", "no");
    await act(async () => {
      element
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseOrderId: "po",
        warehouseId: "wh",
        inspectionPerformed: false,
        inspectorName: null,
        items: [{ purchaseOrderItemId: "line", skuId: "sku", quantity: 10 }],
      }),
    );
    expect(save.mock.calls[0]![0].items[0]).not.toHaveProperty("unitCost");
    expect(save.mock.calls[0]![0].items[0]).not.toHaveProperty("batchNo");
    await act(async () => root.unmount());
    element.remove();
  });
});
