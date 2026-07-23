import { beforeAll, describe, expect, it } from "vitest";
import { GET } from "../app/api/v1/[...segments]/route";

describe("Frozen v1 API route boundary", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-characters";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-characters";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  });

  it("protects Master Data APIs with the shared authentication and response envelope", async () => {
    const response = await GET(new Request("http://localhost/api/v1/products"));
    const body = (await response.json()) as {
      error: { code: string };
      requestId: string;
      success: boolean;
      timestamp: string;
    };

    expect(response.status).toBe(401);
    expect(response.headers.get("X-Request-ID")).toBe(body.requestId);
    expect(body).toMatchObject({
      success: false,
      error: { code: "AUTH_UNAUTHORIZED" },
    });
    expect(body.timestamp).toBeTruthy();
  });

  it("protects Task 7.5-C inventory APIs through the same route boundary", async () => {
    const response = await GET(new Request("http://localhost/api/v1/inventories"));
    const body = (await response.json()) as {
      error: { code: string };
      success: boolean;
    };
    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      success: false,
      error: { code: "AUTH_UNAUTHORIZED" },
    });
  });
});
