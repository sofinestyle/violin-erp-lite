import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatApiError,
  readMasterDataResponse,
  MasterDataWorkbench,
  MasterDataDeleteAction,
} from "../components/master-data/master-data-workbench";
import { WorkbenchHub } from "../components/master-data/workbench-hub";
import { PermissionProvider } from "../contexts/permission-context";
import {
  MASTER_DATA_FIELD_OPTIONS,
  MASTER_WORKBENCHES,
  SECURITY_WORKBENCHES,
  SKU_COLOR_PRESETS,
  SKU_SIZE_PRESETS_BY_CATEGORY,
} from "../lib/master-data";

describe("Master Data PC pages", () => {
  it.each([true, false])(
    "uses the administrator role, not brand update permission, for delete (admin=%s)",
    (administrator) => {
      const definition = MASTER_WORKBENCHES.find((item) => item.key === "brands")!;
      const html = renderToStaticMarkup(
        <PermissionProvider
          roleCodes={administrator ? ["administrator"] : ["sales"]}
          permissions={administrator ? [] : ["master.brand.update"]}
        >
          <MasterDataDeleteAction definition={definition} onConfirm={() => undefined} />
        </PermissionProvider>,
      );
      expect(html.includes("删除")).toBe(administrator);
    },
  );
  it("reads successful delete responses and preserves business errors and trace", async () => {
    const data = { deleted: true, id: "sku-test" };
    await expect(
      readMasterDataResponse(Response.json({ success: true, data })),
    ).resolves.toMatchObject({ data });
    await expect(
      readMasterDataResponse(
        Response.json(
          { success: false, error: { message: "该数据已被业务单据引用，无法删除，请停用。" } },
          { status: 409, headers: { "X-Request-ID": "delete-trace" } },
        ),
      ),
    ).rejects.toThrow("该数据已被业务单据引用，无法删除，请停用。（Request ID：delete-trace）");
  });

  it.each([
    [405, ""],
    [502, "<html>Bad gateway</html>"],
    [200, ""],
    [200, "null"],
    [200, "{}"],
    [200, "[]"],
  ])(
    "handles HTTP %s invalid response %s without exposing parser or server contents",
    async (status, body) => {
      await expect(
        readMasterDataResponse(
          new Response(body, { status, headers: { "X-Request-ID": "response-trace" } }),
        ),
      ).rejects.toThrow(
        `服务响应异常（HTTP ${status}），请刷新列表确认操作结果；如仍有问题，请联系管理员。（Request ID：response-trace）`,
      );
    },
  );
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
    expect(master).toContain("产品 / SKU 规格");
    expect(master).toContain("平台 / 店铺");
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

  it("enables safe delete only for approved master data resources", () => {
    const deletable = MASTER_WORKBENCHES.filter((definition) => definition.deleteSupported).map(
      (definition) => definition.key,
    );
    expect(deletable).toEqual([
      "products",
      "skus",
      "product-categories",
      "brands",
      "manufacturers",
      "suppliers",
      "warehouses",
    ]);
    for (const definition of MASTER_WORKBENCHES) {
      if (deletable.includes(definition.key)) {
        expect(definition.updatePermission).toMatch(/^master\..+\.update$/);
      }
    }
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

  it("keeps product type hidden while preserving the frozen field payload", () => {
    const product = MASTER_WORKBENCHES.find((definition) => definition.key === "products");
    expect(product?.fields.find((field) => field.key === "productNameEn")).toMatchObject({
      label: "产品型号",
      required: true,
    });
    expect(product?.fields.find((field) => field.key === "productType")).toMatchObject({
      defaultValue: "violin",
      hidden: true,
    });
    expect(product?.fields.find((field) => field.key === "defaultUnit")).toMatchObject({
      defaultValue: "unit",
      inputMode: "select",
      options: MASTER_DATA_FIELD_OPTIONS.units,
    });
  });

  it("uses one complete unit option source for Product and SKU", () => {
    const product = MASTER_WORKBENCHES.find((definition) => definition.key === "products");
    const sku = MASTER_WORKBENCHES.find((definition) => definition.key === "skus");
    expect(MASTER_DATA_FIELD_OPTIONS.units.map((option) => option.label)).toEqual([
      "把",
      "只",
      "件",
      "个",
      "条",
      "套",
      "箱",
      "包",
      "支",
      "其他",
    ]);
    expect(product?.fields.find((field) => field.key === "defaultUnit")?.options).toBe(
      MASTER_DATA_FIELD_OPTIONS.units,
    );
    expect(sku?.fields.find((field) => field.key === "unit")?.options).toBe(
      MASTER_DATA_FIELD_OPTIONS.units,
    );
  });

  it("simplifies category entry with presets, derived level and default sort order", () => {
    const category = MASTER_WORKBENCHES.find(
      (definition) => definition.key === "product-categories",
    );
    expect(category?.fields.find((field) => field.key === "categoryName")).toMatchObject({
      defaultValue: "提琴",
      inputMode: "preset-select",
      options: MASTER_DATA_FIELD_OPTIONS.categoryPresets,
    });
    expect(MASTER_DATA_FIELD_OPTIONS.categoryPresets.map((option) => option.label)).toEqual([
      "提琴",
      "吉他",
      "尤克里里",
      "配件",
      "自定义",
    ]);
    expect(category?.fields.find((field) => field.key === "categoryLevel")).toMatchObject({
      defaultValue: "1",
      hidden: true,
    });
    expect(category?.fields.find((field) => field.key === "sortOrder")).toMatchObject({
      defaultValue: "0",
      hidden: true,
    });
  });

  it("renders product category presets as switchable select options", () => {
    const category = MASTER_WORKBENCHES.find(
      (definition) => definition.key === "product-categories",
    );
    const categoryName = category?.fields.find((field) => field.key === "categoryName");
    expect(categoryName?.inputMode).toBe("preset-select");
    expect(categoryName?.defaultValue).toBe("提琴");
    for (const preset of ["提琴", "吉他", "尤克里里", "配件", "自定义"]) {
      expect(categoryName?.options).toContainEqual({ label: preset, value: preset });
    }
  });

  it("hides first-stage automatic code inputs and keeps generated-code display", () => {
    for (const [resource, fieldKey, hint] of [
      ["products", "productCode", "PRD-000001"],
      ["skus", "skuCode", "L2-44-BK"],
      ["suppliers", "supplierCode", "SUP-000001"],
      ["manufacturers", "manufacturerCode", "MFR-000001"],
      ["warehouses", "warehouseCode", "WH-000001"],
    ] as const) {
      const definition = MASTER_WORKBENCHES.find((item) => item.key === resource);
      const field = definition?.fields.find((item) => item.key === fieldKey);
      expect(field).toMatchObject({ autoGeneratedCode: true });
      expect(field?.helpText).toContain(hint);
    }
  });

  it("supports SKU usability defaults with server-side automatic code generation", () => {
    const sku = MASTER_WORKBENCHES.find((definition) => definition.key === "skus");
    expect(sku?.fields.find((field) => field.key === "skuCode")?.helpText).toContain(
      "服务端按型号-尺寸-颜色生成",
    );
    expect(sku?.fields.find((field) => field.key === "productId")).toMatchObject({
      label: "产品型号",
      optionCodeField: "productNameEn",
      optionNameField: "productName",
    });
    expect(sku?.fields.find((field) => field.key === "skuName")?.helpText).toContain("组合生成");
    expect(sku?.fields.find((field) => field.key === "unit")).toMatchObject({
      defaultValue: "unit",
      inputMode: "select",
      options: MASTER_DATA_FIELD_OPTIONS.units,
    });
    expect(sku?.fields.find((field) => field.key === "safetyStockQuantity")).toMatchObject({
      defaultValue: "0",
      label: "最低安全库存",
    });
  });

  it("defines approved SKU size and color presets for combination generation", () => {
    expect(SKU_SIZE_PRESETS_BY_CATEGORY.提琴).toEqual([
      "4/4",
      "3/4",
      "1/2",
      "1/4",
      "1/8",
      "1/10",
      "1/16",
      "自定义",
    ]);
    expect(SKU_SIZE_PRESETS_BY_CATEGORY.吉他).toEqual([
      "36寸",
      "38寸",
      "39寸",
      "40寸",
      "41寸",
      "自定义",
    ]);
    expect(SKU_COLOR_PRESETS.map((option) => option.label)).toEqual([
      "原木色",
      "棕色",
      "黑色",
      "白色",
      "红色",
      "蓝色",
      "绿色",
      "黄绿色",
      "自定义",
    ]);
    expect(SKU_COLOR_PRESETS.find((option) => option.label === "黄绿色")).toMatchObject({
      code: "YG",
    });
  });

  it("uses Chinese dropdowns for settlement, warehouse type and owner responsibility", () => {
    const manufacturer = MASTER_WORKBENCHES.find(
      (definition) => definition.key === "manufacturers",
    );
    const supplier = MASTER_WORKBENCHES.find((definition) => definition.key === "suppliers");
    const warehouse = MASTER_WORKBENCHES.find((definition) => definition.key === "warehouses");
    expect(manufacturer?.fields.find((field) => field.key === "settlementMethod")).toMatchObject({
      inputMode: "select",
      options: MASTER_DATA_FIELD_OPTIONS.settlementMethods,
    });
    expect(supplier?.fields.find((field) => field.key === "settlementMethod")).toMatchObject({
      inputMode: "select",
      options: MASTER_DATA_FIELD_OPTIONS.settlementMethods,
    });
    expect(warehouse?.fields.find((field) => field.key === "warehouseType")).toMatchObject({
      inputMode: "select",
      options: MASTER_DATA_FIELD_OPTIONS.warehouseTypes,
    });
    expect(warehouse?.fields.find((field) => field.key === "ownerType")).toMatchObject({
      inputMode: "select",
      label: "责任主体",
      options: MASTER_DATA_FIELD_OPTIONS.ownerTypes,
    });
    expect(warehouse?.fields.find((field) => field.key === "sortOrder")).toMatchObject({
      defaultValue: "0",
      hidden: true,
    });
    expect(warehouse?.fields.find((field) => field.key === "manufacturerId")).toMatchObject({
      visibleWhen: { equals: "manufacturer", field: "ownerType" },
    });
  });

  it("keeps Store external id business-facing without UUID copy", () => {
    const store = MASTER_WORKBENCHES.find((definition) => definition.key === "stores");
    const externalStoreId = store?.fields.find((field) => field.key === "externalStoreId");
    expect(externalStoreId).toMatchObject({
      helpText: "填写平台后台显示的店铺ID或店铺编号；没有可暂不填写。",
      label: "平台店铺标识",
    });
    expect(`${externalStoreId?.label ?? ""}${externalStoreId?.helpText ?? ""}`).not.toMatch(
      /UUID|uuid/,
    );
    const storeHtml = renderToStaticMarkup(
      <PermissionProvider permissions={["master.store.create"]}>
        <MasterDataWorkbench definition={store!} group="master" />
      </PermissionProvider>,
    );
    expect(storeHtml).not.toMatch(/UUID|uuid/);
  });

  it("renders product and SKU usability hints in master data pages", () => {
    const productHtml = renderToStaticMarkup(
      <PermissionProvider permissions={["master.product.create"]}>
        <MasterDataWorkbench definition={MASTER_WORKBENCHES[0]!} group="master" />
      </PermissionProvider>,
    );
    const skuHtml = renderToStaticMarkup(
      <PermissionProvider permissions={["master.sku.create"]}>
        <MasterDataWorkbench definition={MASTER_WORKBENCHES[1]!} group="master" />
      </PermissionProvider>,
    );
    expect(productHtml).toContain("产品 → SKU 规格");
    expect(skuHtml).toContain("SKU 组合生成");
    expect(productHtml).not.toContain("SKU 批量新增");
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
