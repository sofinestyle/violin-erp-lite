import { beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/v1/[...segments]/route";

describe("Frozen v1 API route boundary", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-characters";
    process.env.JWT_REFRESH_PEPPER = "test-refresh-pepper-with-at-least-32-characters";
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

  it("protects ATT-001 through ATT-004 before Attachment runtime initialization", async () => {
    for (const path of [
      "/api/v1/attachments?objectType=purchase_order&objectId=11111111-1111-4111-8111-111111111111",
      "/api/v1/attachments/11111111-1111-4111-8111-111111111111",
      "/api/v1/attachments/11111111-1111-4111-8111-111111111111/download",
    ]) {
      const response = await GET(new Request(`http://localhost${path}`));
      const body = (await response.json()) as {
        error: { code: string };
        success: boolean;
      };
      expect(response.status).toBe(401);
      expect(body).toMatchObject({
        success: false,
        error: { code: "AUTH_UNAUTHORIZED" },
      });
    }
  });

  it("protects ATT-005 through ATT-008 before Attachment runtime initialization", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    for (const path of [
      `/api/v1/attachments/${id}/links`,
      `/api/v1/attachments/${id}/links/unlink`,
      `/api/v1/attachments/${id}/delete`,
    ]) {
      const response = await POST(
        new Request(`http://localhost${path}`, {
          body: "{}",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "AUTH_UNAUTHORIZED" },
        success: false,
      });
    }
    const lifecycle = await GET(new Request(`http://localhost/api/v1/attachments/${id}/lifecycle`));
    expect(lifecycle.status).toBe(401);
    await expect(lifecycle.json()).resolves.toMatchObject({
      error: { code: "AUTH_UNAUTHORIZED" },
      success: false,
    });
  });

  it("rejects missing credentials before loading runtime configuration", async () => {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshPepper = process.env.JWT_REFRESH_PEPPER;
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_PEPPER;

    try {
      const response = await GET(new Request("http://localhost/api/v1/products"));
      const body = (await response.json()) as {
        error: { code: string };
        success: boolean;
      };

      expect(response.status).toBe(401);
      expect(body).toMatchObject({
        success: false,
        error: { code: "AUTH_UNAUTHORIZED" },
      });
    } finally {
      process.env.JWT_ACCESS_SECRET = accessSecret;
      process.env.JWT_REFRESH_PEPPER = refreshPepper;
    }
  });
});
