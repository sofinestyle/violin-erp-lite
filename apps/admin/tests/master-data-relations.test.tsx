// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MasterDataFieldControl,
  categoryLevelLabel,
  resolveCategoryParents,
} from "../components/master-data/master-data-workbench";
import { MASTER_WORKBENCHES } from "../lib/master-data";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Master Data async relation regression", () => {
  it.each([
    ["skus", "productId", "productCode", "productName", "L3｜实木假花纹小提琴"],
    ["product-categories", "parentCategoryId", "categoryCode", "categoryName", "CAT-000001 / 提琴"],
    ["stores", "platformId", "platformCode", "platformName", "PLT-000001 / 测试平台"],
  ])(
    "restores %s selection after options arrive and preserves it on save",
    async (resource, key, codeKey, nameKey, label) => {
      const definition = MASTER_WORKBENCHES.find((item) => item.key === resource)!;
      const field = definition.fields.find((item) => item.key === key)!;
      const element = document.createElement("div");
      document.body.append(element);
      const root = createRoot(element);
      const option = {
        id: "current-id",
        [codeKey]: resource === "stores" ? "PLT-000001" : "CAT-000001",
        [nameKey]:
          resource === "skus" ? "实木假花纹小提琴" : resource === "stores" ? "测试平台" : "提琴",
        productNameEn: "L3",
      };
      function Form({ loading }: { loading: boolean }) {
        const [values, setValues] = useState({ [key]: "current-id" });
        return (
          <form>
            <MasterDataFieldControl
              definition={definition}
              field={field}
              disabled={false}
              formValues={values}
              selected={{ id: "record-id", [key]: "current-id" }}
              relationOptions={loading ? {} : { [key]: [option] }}
              relationOptionsLoading={loading}
              onValueChange={(name, value) =>
                setValues((current) => ({ ...current, [name]: value }))
              }
            />
            <input name="remark" defaultValue="before" />
          </form>
        );
      }
      await act(async () => root.render(<Form loading />));
      expect(element.querySelector("select")!.disabled).toBe(true);
      await act(async () => root.render(<Form loading={false} />));
      const select = element.querySelector("select")!;
      expect(select.value).toBe("current-id");
      expect(select.selectedOptions[0]?.textContent).toBe(label);
      element.querySelector<HTMLInputElement>('input[name="remark"]')!.value = "changed";
      expect(new FormData(element.querySelector("form")!).get(key)).toBe("current-id");
      await act(async () => {
        select.value = "";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(select.value).toBe("");
      await act(async () => {
        select.value = "current-id";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(new FormData(element.querySelector("form")!).get(key)).toBe("current-id");
      await act(async () => root.unmount());
    },
  );

  it("resolves parents outside the filtered page once, preserving human names", async () => {
    const read = vi.fn().mockResolvedValue({ id: "parent", categoryName: "提琴" });
    const result = await resolveCategoryParents(
      [
        { id: "child-a", parentCategoryId: "parent", categoryLevel: 2 },
        { id: "child-b", parentCategoryId: "parent", categoryLevel: 2 },
      ],
      read,
    );
    expect(result).toEqual({ parent: "提琴" });
    expect(read).toHaveBeenCalledTimes(1);
    expect(categoryLevelLabel(1)).toBe("一级");
    expect(categoryLevelLabel(2)).toBe("二级");
    read.mockClear();
    await resolveCategoryParents(
      [
        { id: "parent", categoryName: "提琴" },
        { id: "child", parentCategoryId: "parent" },
      ],
      read,
    );
    expect(read).not.toHaveBeenCalled();
  });
});
