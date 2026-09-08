type Category = { id: string; [key: string]: unknown };

/** Keep ancestry metadata while excluding the edited subtree from possible parents. */
export function categoryParentOptions(
  records: readonly Category[],
  editedId?: string,
  currentParentId?: string,
): Category[] {
  const children = new Map<string, Category[]>();
  const ids = new Set(records.map((item) => item.id));
  for (const item of records) {
    const parent =
      typeof item.parentCategoryId === "string" && ids.has(item.parentCategoryId)
        ? item.parentCategoryId
        : "";
    children.set(parent, [...(children.get(parent) ?? []), item]);
  }
  const excluded = new Set<string>();
  const pending = editedId ? [editedId] : [];
  for (let i = 0; i < pending.length; i += 1) {
    const id = pending[i]!;
    if (excluded.has(id)) continue;
    excluded.add(id);
    pending.push(...(children.get(id) ?? []).map((child) => child.id));
  }
  const result: Category[] = [];
  const visited = new Set<string>();
  const visit = (item: Category, depth: number) => {
    if (visited.has(item.id) || excluded.has(item.id)) return;
    visited.add(item.id);
    if (item.isActive !== false || item.id === currentParentId)
      result.push({
        ...item,
        treeLabel: `${depth ? "　".repeat(depth) + "└─ " : ""}${String(item.categoryName ?? "未命名分类")}`,
      });
    for (const child of children.get(item.id) ?? []) visit(child, depth + 1);
  };
  for (const root of children.get("") ?? []) visit(root, 0);
  // Cyclic legacy data is never offered as a parent; the server also rejects it.
  return result;
}
