import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatApiError,
  MasterDataWorkbench,
} from "../components/master-data/master-data-workbench";
import { WorkbenchHub } from "../components/master-data/workbench-hub";
import { PermissionProvider } from "../contexts/permission-context";
import { MASTER_WORKBENCHES, SECURITY_WORKBENCHES } from "../lib/master-data";

describe("Master Data PC pages", () => {
  it("renders all nine master-data entries and two security entries", () => {
    const master = renderToStaticMarkup(
      <WorkbenchHub basePath="/workspace/master-data" definitions={MASTER_WORKBENCHES} />,
    );
    const security = renderToStaticMarkup(
      <WorkbenchHub basePath="/workspace/access-control" definitions={SECURITY_WORKBENCHES} />,
    );
    for (const label of [
      "产品",
      "SKU",
      "产品分类",
      "品牌",
      "电商平台",
      "生产厂家",
      "供应商",
      "仓库",
      "店铺",
    ]) {
      expect(master).toContain(`${label}管理`);
    }
    expect(security).toContain("用户管理");
    expect(security).toContain("角色管理");
  });

  it("renders table, search, filter, import entry and permission-controlled create action", () => {
    const definition = MASTER_WORKBENCHES[0]!;
    const html = renderToStaticMarkup(
      <PermissionProvider permissions={["master.product.create", "master.product.update"]}>
        <MasterDataWorkbench definition={definition} group="master" />
      </PermissionProvider>,
    );
    expect(html).toContain("搜索产品编码或名称");
    expect(html).toContain("状态");
    expect(html).toContain("导入");
    expect(html).toContain("新增产品");
    expect(html).toContain("正在加载");
  });

  it("keeps unauthorized actions hidden in the page layer", () => {
    const html = renderToStaticMarkup(
      <PermissionProvider>
        <MasterDataWorkbench definition={MASTER_WORKBENCHES[0]!} group="master" />
      </PermissionProvider>,
    );
    expect(html).not.toContain("新增产品");
  });

  it("uses approved option endpoints for product relation fields", () => {
    const product = MASTER_WORKBENCHES.find((definition) => definition.key === "products");
    expect(product?.fields.find((field) => field.key === "categoryId")).toMatchObject({
      optionCodeField: "categoryCode",
      optionNameField: "categoryName",
      optionResource: "product-categories",
    });
    expect(product?.fields.find((field) => field.key === "brandId")).toMatchObject({
      optionCodeField: "brandCode",
      optionNameField: "brandName",
      optionResource: "brands",
    });
  });

  it("surfaces API validation field details and request id to operators", () => {
    expect(
      formatApiError({
        error: {
          code: "VALIDATION_ERROR",
          details: [{ field: "categoryId", message: "产品分类必须存在且启用" }],
          message: "请求数据校验失败",
        },
        requestId: "9e8e5237-d350-479c-9a3b-35132a5ba947",
        success: false,
      }),
    ).toContain("categoryId：产品分类必须存在且启用");
    expect(
      formatApiError({
        error: {
          code: "VALIDATION_ERROR",
          details: [{ field: "categoryId", message: "产品分类必须存在且启用" }],
          message: "请求数据校验失败",
        },
        requestId: "9e8e5237-d350-479c-9a3b-35132a5ba947",
        success: false,
      }),
    ).toContain("9e8e5237-d350-479c-9a3b-35132a5ba947");
  });
});
