import type { AttachmentAccessScopeResolver } from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

export class PrismaAttachmentAccessScopeResolver implements AttachmentAccessScopeResolver {
  readonly #client: Pick<PrismaClient, "warehouses">;

  constructor(client: Pick<PrismaClient, "warehouses"> = getPrismaClient()) {
    this.#client = client;
  }

  async resolveManufacturerIds(warehouseIds: readonly string[]): Promise<readonly string[]> {
    if (warehouseIds.length === 0) return Object.freeze([]);
    const warehouses = await this.#client.warehouses.findMany({
      select: { manufacturer_id: true },
      where: {
        id: { in: [...new Set(warehouseIds)] },
        is_active: true,
        manufacturer_id: { not: null },
      },
    });
    return Object.freeze([
      ...new Set(
        warehouses.flatMap(({ manufacturer_id }) =>
          manufacturer_id === null ? [] : [manufacturer_id],
        ),
      ),
    ]);
  }
}
