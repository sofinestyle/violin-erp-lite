import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PurchaseInboundForm,
  PurchaseInboundDetail,
} from "@/components/workflow/purchase-inbound-experience";
import { procurementViews, productionViews } from "@/lib/workflow";
const order = {
  id: "po",
  businessStatus: "purchasing",
  documentNo: "PO-UAT",
  supplierNameSnapshot: "UAT供应商",
  purchaseOrderItems: [
    {
      id: "line",
      skuCodeSnapshot: "UAT-SKU",
      productModel: "L3",
      productName: "小提琴",
      size: "4/4",
      color: "棕色",
      quantity: 10,
      inboundQuantity: 0,
      unitPrice: 300,
    },
  ],
};
describe("CR-013 purchase inbound presentation", () => {
  it("shows direct source, date picker and mandatory undecided inspection choice without cost or batch inputs", () => {
    const html = renderToStaticMarkup(
      <PurchaseInboundForm
        initialOrderId="po"
        orders={[{ value: "po", label: "PO-UAT", raw: order }]}
        warehouses={[]}
        saving={false}
        error={null}
        onCancel={() => {}}
        onSave={async () => {}}
      />,
    );
    for (const label of [
      "采购订单",
      "入库日期",
      "是否质检",
      "确认保存",
      "UAT-SKU",
      "L3",
      "4/4",
      "棕色",
    ])
      expect(html).toContain(label);
    expect(html).toContain('<option value="" selected="">请选择</option>');
    expect(html).not.toContain('aria-label="质检人"');
    expect(html).not.toContain('type="date"');
    for (const text of ["单位成本", "批次", "已确认采购质检单"]) expect(html).not.toContain(text);
  });
  it("keeps independent purchase and production direct inbound navigation", () => {
    expect(procurementViews.map((v) => v.label)).toEqual(["采购订单", "采购入库"]);
    expect(productionViews.map((v) => v.label)).toEqual(["生产订单", "成品入库"]);
  });
  it("shows receipt results without raw identifiers and keeps unknown history distinct from no inspection", () => {
    const html = renderToStaticMarkup(
      <PurchaseInboundDetail
        row={{
          id: "secret-uuid",
          inspectionOrderId: "inspection-uuid",
          status: "completed",
          documentDate: "2026-09-29T00:00:00Z",
          purchaseOrderNo: "PO-UAT",
          supplierName: "供应商",
          warehouseName: "UAT仓库",
          inspectionPerformed: null,
          inboundOrderItems: [],
        }}
      />,
    );
    expect(html).toContain("历史未记录");
    expect(html).toContain("库存及流水已记录");
    expect(html).not.toContain("secret-uuid");
    expect(html).not.toContain("inspection-uuid");
  });
});
