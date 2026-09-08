import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { categoryParentOptions } from "../lib/category-hierarchy";
import { MASTER_WORKBENCHES } from "../lib/master-data";
import { MasterDataDeleteAction } from "../components/master-data/master-data-workbench";
import { PermissionProvider } from "../contexts/permission-context";
const records = [
  { id: "root", categoryName: "提琴", parentCategoryId: null },
  { id: "child", categoryName: "小提琴", parentCategoryId: "root" },
  { id: "leaf", categoryName: "三级", parentCategoryId: "child" },
  { id: "sibling", categoryName: "中提琴", parentCategoryId: "root" },
  { id: "other", categoryName: "吉他", parentCategoryId: null },
];
describe("hierarchy and safe delete UX", () => {
  it("orders arbitrary depth and removes the whole edited subtree", () => {
    expect(categoryParentOptions(records).map((item) => item.treeLabel)).toEqual([
      "提琴",
      "　└─ 小提琴",
      "　　└─ 三级",
      "　└─ 中提琴",
      "吉他",
    ]);
    expect(categoryParentOptions(records, "child").map((item) => item.id)).toEqual([
      "root",
      "sibling",
      "other",
    ]);
    expect(categoryParentOptions(records, "root").map((item) => item.id)).toEqual(["other"]);
    expect(
      categoryParentOptions([
        ...records,
        { id: "bad", categoryName: "循环", parentCategoryId: "bad" },
      ]).some((item) => item.id === "bad"),
    ).toBe(false);
  });
  it.each(["stores", "warehouses"])("only administrator sees %s delete", (resource) => {
    const definition = MASTER_WORKBENCHES.find((item) => item.key === resource)!;
    for (const admin of [true, false]) {
      const markup = renderToStaticMarkup(
        <PermissionProvider
          roleCodes={admin ? ["administrator"] : ["sales"]}
          permissions={[definition.updatePermission]}
        >
          <MasterDataDeleteAction definition={definition} onConfirm={() => undefined} />
        </PermissionProvider>,
      );
      expect(markup.includes("删除")).toBe(admin);
    }
  });
  it("uses business wording without changing the boolean default", () => {
    const field = MASTER_WORKBENCHES.find((item) => item.key === "warehouses")!.fields.find(
      (item) => item.key === "allowsAvailableStock",
    )!;
    expect(field.label).toBe("计入可用库存");
    expect(field.helpText).toBe(
      "开启后，该仓库中的库存计入可销售、可领用的可用库存。在途、待检、不良品等仓库通常建议关闭。",
    );
    expect(field.defaultValue).toBeUndefined();
  });
});
