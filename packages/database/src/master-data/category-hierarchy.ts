import { ValidationError, recordAuditEvent, type RequestContext } from "@violin-erp/api";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaAuditWriter } from "../audit/prisma-audit-writer.js";

// All formal category structure writes use the same transaction lock, including deletes.
export async function lockCategoryHierarchy(client: PrismaClient): Promise<void> {
  await client.$queryRawUnsafe(
    "SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended('violin:category-hierarchy', 0))",
  );
}

export async function categoryLevelForParent(
  client: PrismaClient,
  parentId: unknown,
  id?: string,
): Promise<number> {
  const seen = new Set<string>(id ? [id] : []);
  let current = typeof parentId === "string" && parentId ? parentId : null;
  let level = 1;
  while (current) {
    if (seen.has(current))
      throw new ValidationError("上级分类不能是自身或下级分类，不能形成分类循环。");
    seen.add(current);
    const parent = await client.product_categories.findUnique({
      where: { id: current },
      select: { parent_category_id: true },
    });
    if (!parent) throw new ValidationError("上级分类不存在。");
    current = parent.parent_category_id;
    level += 1;
  }
  return level;
}

export async function syncDescendantLevels(
  client: PrismaClient,
  id: string,
  level: number,
  actorUserId: string,
  context?: RequestContext,
): Promise<void> {
  const queue = [{ id, level }];
  const seen = new Set([id]);
  for (let index = 0; index < queue.length; index += 1) {
    const parent = queue[index]!;
    const children = await client.product_categories.findMany({
      where: { parent_category_id: parent.id },
      select: { id: true, category_level: true },
    });
    for (const child of children) {
      if (seen.has(child.id)) throw new ValidationError("分类层级存在循环，无法保存。");
      seen.add(child.id);
      const nextLevel = parent.level + 1;
      if (child.category_level !== nextLevel) {
        await client.product_categories.update({
          where: { id: child.id },
          data: { category_level: nextLevel, updated_by: actorUserId, updated_at: new Date() },
        });
        await recordAuditEvent(
          new PrismaAuditWriter(client),
          {
            action: "update-derived-level",
            actorUserId,
            moduleCode: "master.category",
            requestId: context?.requestId ?? randomUUID(),
            resourceId: child.id,
            resourceType: "product-categories",
            result: "success",
            timestamp: new Date(context?.timestamp ?? Date.now()),
            beforeSnapshot: { categoryLevel: child.category_level },
            afterSnapshot: { categoryLevel: nextLevel, ancestorId: id },
          },
          { failureMode: "required" },
        );
      }
      queue.push({ id: child.id, level: nextLevel });
    }
  }
}
