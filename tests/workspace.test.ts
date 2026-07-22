import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  name: string;
  private: boolean;
  scripts?: Record<string, string>;
};

const workspaceProjects = [
  ["package.json", "violin-erp-lite"],
  ["apps/admin/package.json", "@violin-erp/admin"],
  ["apps/miniapp/package.json", "@violin-erp/miniapp"],
  ["packages/api/package.json", "@violin-erp/api"],
  ["packages/database/package.json", "@violin-erp/database"],
  ["packages/shared/package.json", "@violin-erp/shared"],
] as const;

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(readFileSync(resolve(relativePath), "utf8")) as PackageManifest;
}

describe("workspace skeleton", () => {
  it.each(workspaceProjects)("recognizes %s as %s", (manifestPath, expectedName) => {
    const manifest = readManifest(manifestPath);

    expect(manifest.name).toBe(expectedName);
    expect(manifest.private).toBe(true);
  });

  it("exposes the root quality gate scripts", () => {
    const manifest = readManifest("package.json");

    expect(Object.keys(manifest.scripts ?? {})).toEqual(
      expect.arrayContaining([
        "lint",
        "lint:fix",
        "format",
        "format:check",
        "typecheck",
        "test",
        "build",
        "check",
      ]),
    );
  });
});
