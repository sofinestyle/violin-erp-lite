import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DatePicker,
  PurchaseDetail,
  PurchaseForm,
  PurchaseListCells,
  lineAmount,
  money,
  purchaseSummary,
  dateOnly,
} from "@/components/workflow/purchase-experience";
import { categoryTreeRows, categoryParentOptions } from "@/lib/category-hierarchy";
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  documentNo: "PO-UAT",
  documentDate: "2026-09-28T00:00:00.000Z",
  expectedDeliveryDate: "2026-10-01T00:00:00.000Z",
  supplierNameSnapshot: "UAT供应商",
  settlementMethod: "月结",
  businessStatus: "pending_approval",
  currencyCode: "CNY",
  totalAmount: 3000,
  purchaseOrderItems: [
    {
      id: "technical-item",
      skuCodeSnapshot: "L3-44-BR",
      skuNameSnapshot: "实木小提琴",
      productModel: "L3",
      productName: "实木小提琴",
      size: "4/4",
      color: "棕色",
      quantity: 10,
      unitPrice: 300,
      lineAmount: 3000,
    },
  ],
};
describe("purchase business presentation", () => {
  it("calculates rounded line amounts and respects order currency", () => {
    expect(lineAmount(10, 300)).toBe(3000);
    expect(lineAmount(12, 300)).toBe(3600);
    expect(lineAmount(10, 301)).toBe(3010);
    expect(lineAmount(3, 0.1)).toBe(0.3);
    expect(money(3000, "USD")).toContain("3,000.00");
    expect(money(3000, "USD")).not.toBe(money(3000, "CNY"));
  });
  it("limits purchase list to business summary without number, UUID or timestamps", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <tr>
            <PurchaseListCells row={row} />
          </tr>
        </tbody>
      </table>,
    );
    expect(html).toContain("2026-09-28");
    expect(html).toContain("待审核");
    expect(html).toContain("3,000.00");
    expect(html).not.toContain(row.id);
    expect(html).not.toContain("PO-UAT");
    expect(html).not.toContain("T00:");
    const summary = purchaseSummary({
      ...row,
      purchaseOrderItems: [...row.purchaseOrderItems, ...row.purchaseOrderItems],
    });
    expect(summary.quantity).toBe(20);
    expect(summary.unitPrice).toBe("多明细");
    expect(summary.sku).toContain("等2项");
  });
  it("renders complete details and date-only system information without technical identifiers", () => {
    const html = renderToStaticMarkup(
      <PurchaseDetail
        row={{
          ...row,
          createdAt: row.documentDate,
          updatedAt: row.documentDate,
          creatorName: "制单员",
          approverName: "审核员",
        }}
      />,
    );
    for (const text of [
      "PO-UAT",
      "L3-44-BR",
      "产品型号",
      "L3",
      "实木小提琴",
      "4/4",
      "棕色",
      "SKU项数",
      "系统信息",
      "制单员",
    ])
      expect(html).toContain(text);
    for (const text of [row.id, "technical-item", "T00:", "pending_approval"])
      expect(html).not.toContain(text);
    expect(dateOnly(row.documentDate)).toBe("2026-09-28");
  });
  it("uses calendar buttons and a supplier-derived settlement field, with no line delivery input", () => {
    const html = renderToStaticMarkup(
      <PurchaseForm
        suppliers={[]}
        skus={[]}
        saving={false}
        error={null}
        onCancel={() => {}}
        onSave={async () => {}}
      />,
    );
    expect(html).toContain("采购明细");
    expect(html).toContain("选择供应商后自动带出");
    expect(html).toContain('aria-label="采购日期"');
    expect(html).toContain('aria-label="预计交付日"');
    expect(html).not.toContain("明细交期");
    expect(html).not.toContain('name="settlementMethod"');
    expect(
      renderToStaticMarkup(<DatePicker label="日期" value="2026-09-28" onChange={() => {}} />),
    ).toContain("2026-09-28");
  });
  it("keeps inactive parents, preorder siblings and arbitrary depth, excluding cycles from choices", () => {
    const categories = [
      { id: "child", parentCategoryId: "root", categoryName: "小提琴" },
      { id: "grandchild", parentCategoryId: "child", categoryName: "儿童小提琴" },
      { id: "root", categoryName: "提琴", isActive: false },
      { id: "other", categoryName: "吉他" },
    ];
    const tree = categoryTreeRows(categories);
    expect(tree.map((item) => item.id)).toEqual(["root", "child", "grandchild", "other"]);
    expect(tree[2]?.treeLabel).toBe("　　└─ 儿童小提琴");
    expect(categoryParentOptions(categories, "child").map((item) => item.id)).not.toContain(
      "grandchild",
    );
    expect(
      categoryTreeRows([
        { id: "a", parentCategoryId: "b" },
        { id: "b", parentCategoryId: "a" },
      ]),
    ).toHaveLength(2);
  });
});
