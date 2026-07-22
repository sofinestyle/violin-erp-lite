import { describe, expect, it } from "vitest";
import { getPrismaClient } from "../src/index";

describe("Prisma Client singleton", () => {
  it("reuses one client instance within the process", () => {
    const databaseUrl = "postgresql://test:test@localhost:5432/test";

    expect(getPrismaClient(databaseUrl)).toBe(getPrismaClient(databaseUrl));
  });
});
