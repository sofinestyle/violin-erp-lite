import { describe, expect, it, vi } from "vitest";
import {
  AppError,
  ConflictError,
  createHealthCheckHandler,
  createLogger,
  createRequestContext,
  createRouteHandler,
  createSuccessResponse,
  type LogRecord,
  type Logger,
} from "../src/index";

const REQUEST_ID = "request-test-123";
const TIMESTAMP = "2026-07-22T10:00:00.000Z";

function silentLogger(records: LogRecord[] = []): Logger {
  return createLogger({
    now: () => new Date(TIMESTAMP),
    sink: (record) => records.push(record),
  });
}

describe("API common framework", () => {
  it("creates the Frozen-compatible success response", async () => {
    const context = createRequestContext(new Request("http://localhost/test"), {
      generateRequestId: () => REQUEST_ID,
      now: () => new Date(TIMESTAMP),
    });
    const response = createSuccessResponse({ value: true }, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBe(REQUEST_ID);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { value: true },
      meta: {},
      requestId: REQUEST_ID,
      timestamp: TIMESTAMP,
    });
  });

  it("maps a known error to the unified safe response", async () => {
    const handler = createRouteHandler(
      async () => {
        throw new ConflictError("请求存在冲突");
      },
      {
        generateRequestId: () => REQUEST_ID,
        logger: silentLogger(),
        now: () => new Date(TIMESTAMP),
      },
    );
    const response = await handler(new Request("http://localhost/test"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "CONFLICT_REQUEST",
        message: "请求存在冲突",
        details: [],
      },
      requestId: REQUEST_ID,
      timestamp: TIMESTAMP,
    });
  });

  it("generates and propagates a Request ID to the body, header and log context", async () => {
    const records: LogRecord[] = [];
    const handler = createRouteHandler(
      async (_request, context) => createSuccessResponse(null, context),
      {
        generateRequestId: () => REQUEST_ID,
        logger: silentLogger(records),
        now: () => new Date(TIMESTAMP),
      },
    );
    const response = await handler(new Request("http://localhost/test"));

    expect(response.headers.get("X-Request-ID")).toBe(REQUEST_ID);
    expect(records.every((record) => record.requestId === REQUEST_ID)).toBe(true);
  });

  it("preserves a valid client Request ID", async () => {
    const handler = createRouteHandler(
      async (_request, context) => createSuccessResponse(null, context),
      {
        generateRequestId: () => "unused-generated-id",
        logger: silentLogger(),
        now: () => new Date(TIMESTAMP),
      },
    );
    const request = new Request("http://localhost/test", {
      headers: { "X-Request-ID": REQUEST_ID },
    });
    const response = await handler(request);

    expect(response.headers.get("X-Request-ID")).toBe(REQUEST_ID);
    expect((await response.json()) as { requestId: string }).toMatchObject({
      requestId: REQUEST_ID,
    });
  });

  it("converts unknown errors without exposing internal details", async () => {
    const handler = createRouteHandler(
      async () => {
        throw new Error("postgresql://user:password@internal/database stack");
      },
      {
        generateRequestId: () => REQUEST_ID,
        logger: silentLogger(),
        now: () => new Date(TIMESTAMP),
      },
    );
    const response = await handler(new Request("http://localhost/test"));
    const body = (await response.json()) as {
      error: { code: string; details: unknown[]; message: string };
    };

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: "SYSTEM_INTERNAL_ERROR",
      message: "系统异常，请稍后重试",
      details: [],
    });
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  it("rejects invalid application error codes", () => {
    expect(() => new AppError("invalid-code", 400, "无效错误码")).toThrow(
      "错误码必须使用大写英文、数字和下划线",
    );
  });
});

describe("health check", () => {
  it("returns application and database health", async () => {
    const checkDatabase = vi.fn().mockResolvedValue(undefined);
    const handler = createHealthCheckHandler({
      checkDatabase,
      routeHandlerOptions: {
        generateRequestId: () => REQUEST_ID,
        logger: silentLogger(),
        now: () => new Date(TIMESTAMP),
      },
    });
    const response = await handler(new Request("http://localhost/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        application: { status: "ok" },
        database: { status: "connected" },
      },
      requestId: REQUEST_ID,
      timestamp: TIMESTAMP,
    });
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  it("returns a safe 503 response when the database is unavailable", async () => {
    const handler = createHealthCheckHandler({
      checkDatabase: vi.fn().mockRejectedValue(new Error("secret database failure")),
      routeHandlerOptions: {
        generateRequestId: () => REQUEST_ID,
        logger: silentLogger(),
        now: () => new Date(TIMESTAMP),
      },
    });
    const response = await handler(new Request("http://localhost/api/health"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "SYSTEM_SERVICE_UNAVAILABLE",
        message: "服务暂不可用，请稍后重试",
      },
      requestId: REQUEST_ID,
      timestamp: TIMESTAMP,
    });
    expect(JSON.stringify(body)).not.toContain("secret database failure");
  });
});
