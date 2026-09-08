import { describe, it, expect, vi } from "vitest";
import {
  PrismaMasterDataRepository,
  REFERENCE_CHECKS,
} from "../src/master-data/prisma-master-data-repository";
import { categoryLevelForParent } from "../src/master-data/category-hierarchy";

const id = "11111111-1111-4111-8111-111111111111";
function fixture(resource: "stores" | "warehouses", blocked?: number) {
  const order: string[] = [];
  const client: Record<string, unknown> = {
    $queryRawUnsafe: vi.fn(async () => {
      order.push("lock");
      return [{ id }];
    }),
    [resource]: {
      findFirst: vi.fn(async () => {
        order.push("scope-check");
        return { id, [resource === "stores" ? "store_code" : "warehouse_code"]: "UAT-SAFE" };
      }),
      deleteMany: vi.fn(async () => {
        order.push("delete");
        return { count: 1 };
      }),
    },
    [resource === "stores" ? "role_stores" : "role_warehouses"]: {
      deleteMany: vi.fn(async () => {
        order.push("scope-remove");
        return { count: 2 };
      }),
    },
  };
  REFERENCE_CHECKS[resource].forEach((check) => {
    client[check.model] ??= {
      count: vi.fn(async (args: { where: Record<string, string> }) => {
        const chosen = blocked === undefined ? undefined : REFERENCE_CHECKS[resource][blocked];
        order.push("reference-check");
        return chosen?.model === check.model && args.where[chosen.field] === id ? 1 : 0;
      }),
    };
  });
  const repository = new PrismaMasterDataRepository({
    ...client,
    $transaction: async (work: (tx: unknown) => unknown) => work(client),
  } as never);
  return { repository, order, client };
}
describe("CR-010 transaction boundaries and reference coverage", () => {
  it.each(["stores", "warehouses"] as const)(
    "locks, checks and deletes only target scopes before %s and audit",
    async (resource) => {
      const { repository, order, client } = fixture(resource);
      await expect(
        repository.delete(resource, id, id, async () => {
          order.push("audit");
        }),
      ).resolves.toEqual({ status: "deleted", id });
      expect(order.slice(0, 2)).toEqual(["lock", "scope-check"]);
      expect(order.slice(-3)).toEqual(["scope-remove", "delete", "audit"]);
      const scope = client[resource === "stores" ? "role_stores" : "role_warehouses"] as {
        deleteMany: ReturnType<typeof vi.fn>;
      };
      expect(scope.deleteMany).toHaveBeenCalledWith({
        where: { [resource === "stores" ? "store_id" : "warehouse_id"]: id },
      });
    },
  );
  for (const resource of ["stores", "warehouses"] as const) {
    it.each(REFERENCE_CHECKS[resource].map((check, index) => ({ ...check, index })))(
      `${resource} refuses $model.$field without scope mutation`,
      async ({ index }) => {
        const { repository, order } = fixture(resource, index);
        const audit = vi.fn();
        expect((await repository.delete(resource, id, id, audit)).status).toBe("referenced");
        expect(order).not.toContain("scope-remove");
        expect(order).not.toContain("delete");
        expect(audit).not.toHaveBeenCalled();
      },
    );
  }
  it("derives depth from ancestry and rejects self, descendants and preexisting cycles", async () => {
    const parents: Record<string, string | null> = {
      root: null,
      child: "root",
      leaf: "child",
      bad: "bad",
    };
    const client = {
      product_categories: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
          parent_category_id: parents[where.id],
        })),
      },
    };
    expect(await categoryLevelForParent(client as never, "leaf")).toBe(4);
    expect(await categoryLevelForParent(client as never, null)).toBe(1);
    for (const [parent, current] of [
      ["root", "root"],
      ["leaf", "root"],
      ["bad", "other"],
    ]) {
      await expect(categoryLevelForParent(client as never, parent, current)).rejects.toThrow(
        "循环",
      );
    }
  });
});
