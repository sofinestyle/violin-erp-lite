import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ProductionForm,
  ProductionDetail,
  ProductionListCells,
} from "@/components/workflow/production-experience";
import { ProductionInboundForm } from "@/components/workflow/production-inbound-experience";
describe("CR-014 production presentation", () => {
  it("uses calendar, multi-item controls and no duplicate start date", () => {
    const html = renderToStaticMarkup(
      <ProductionForm
        manufacturers={[]}
        skus={[]}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    for (const label of ["生产日期", "订单明细", "添加SKU", "加工单价", "暂估生产入库成本"])
      expect(html).toContain(label);
    expect(html).not.toContain("计划开始日");
    expect(html).not.toContain('type="date"');
  });
  it("renders business summary, per-SKU remainder and historical inspection meaning without UUID", () => {
    const row = {
      id: "private-uuid",
      businessStatus: "partially_received",
      documentDate: "2026-09-29T00:00:00Z",
      manufacturerNameSnapshot: "UAT厂家",
      totalQuantity: 150,
      productionOrderItems: [
        { skuCodeSnapshot: "A", plannedQuantity: 100, inboundQuantity: 40 },
        { skuCodeSnapshot: "B", plannedQuantity: 50, inboundQuantity: 50 },
      ],
    };
    const html = renderToStaticMarkup(
      <>
        <table>
          <tbody>
            <tr>
              <ProductionListCells row={row} />
            </tr>
          </tbody>
        </table>
        <ProductionDetail row={row} />
      </>,
    );
    for (const label of ["等2项", "部分入库", "60", "累计已入库", "剩余数量"])
      expect(html).toContain(label);
    expect(html).not.toContain("private-uuid");
    expect(html).not.toContain("T00:");
  });
  it("requires an explicit inspection choice and hides cost and batch inputs", () => {
    const html = renderToStaticMarkup(
      <ProductionInboundForm
        orders={[]}
        warehouses={[]}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(html).toContain('<option value="" selected="">请选择</option>');
    expect(html).not.toMatch(/单位成本|批次号|质检单|UUID/);
  });
});
