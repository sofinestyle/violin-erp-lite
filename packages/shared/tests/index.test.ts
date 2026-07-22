import { describe, expect, it } from "vitest";
import * as packageEntry from "../src/index";

describe("@violin-erp/shared skeleton", () => {
  it("remains free of business facts", () => {
    expect(Object.keys(packageEntry)).toEqual([]);
  });
});
