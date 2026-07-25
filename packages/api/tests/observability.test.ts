import { describe, expect, it } from "vitest";
import {
  createDatabaseHealthProvider,
  createLogger,
  createRequestContext,
  createStaticHealthProvider,
  createTraceContext,
  HealthChecker,
  InMemoryMetricsRegistry,
  runWithRequestContext,
  type LogRecord,
} from "../src/index";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-07-25T13:00:00.000Z");

describe("Trace foundation", () => {
  it("creates HTTP trace context using request_trace_id semantics", () => {
    const context = createRequestContext(
      new Request("http://localhost/test", {
        headers: { "X-Request-ID": REQUEST_ID },
      }),
      { now: () => NOW, service: "violin-erp-api" },
    );

    expect(context).toMatchObject({
      requestId: REQUEST_ID,
      requestTraceId: REQUEST_ID,
      service: "violin-erp-api",
      timestamp: NOW.toISOString(),
    });
  });

  it("creates Job and Event trace context without business semantics", () => {
    const context = createTraceContext(
      {
        consumerId: "consumer-a",
        eventId: "22222222-2222-4222-8222-222222222222",
        jobId: "33333333-3333-4333-8333-333333333333",
        requestTraceId: REQUEST_ID,
        service: "violin-erp-worker",
      },
      { now: () => NOW },
    );

    expect(context).toMatchObject({
      consumerId: "consumer-a",
      eventId: "22222222-2222-4222-8222-222222222222",
      jobId: "33333333-3333-4333-8333-333333333333",
      requestTraceId: REQUEST_ID,
      service: "violin-erp-worker",
    });
  });
});

describe("Structured Logging foundation", () => {
  it("writes JSON-compatible records with trace fields and sanitized sensitive data", () => {
    const records: LogRecord[] = [];
    const logger = createLogger({
      now: () => NOW,
      service: "violin-erp-api",
      sink: (record) => records.push(record),
    });
    const context = createTraceContext(
      { jobId: "job-1", requestTraceId: REQUEST_ID, service: "violin-erp-api" },
      { now: () => NOW },
    );

    runWithRequestContext(context, () => {
      logger.error("job.execution.failed", {
        authorization: "Bearer secret-token",
        context: { databaseUrl: "postgresql://user:password@host/db", safe: "visible" },
        duration_ms: 42,
        error_code: "JOB_HANDLER_FAILED",
        privatePath: "/private/storage/object",
      });
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      duration_ms: 42,
      error_code: "JOB_HANDLER_FAILED",
      event: "job.execution.failed",
      job_id: "job-1",
      level: "error",
      request_trace_id: REQUEST_ID,
      service: "violin-erp-api",
      timestamp: NOW.toISOString(),
    });
    expect(records[0]?.fields.authorization).toBe("[REDACTED]");
    expect(records[0]?.fields.privatePath).toBe("[REDACTED]");
    expect(records[0]?.fields.context).toEqual({
      databaseUrl: "[REDACTED]",
      safe: "visible",
    });
    expect(() => JSON.stringify(records[0])).not.toThrow();
  });
});

describe("Metrics foundation", () => {
  it("supports Counter, Gauge and Histogram snapshots in memory", () => {
    const metrics = new InMemoryMetricsRegistry();

    metrics.incrementCounter("http_request_count", { method: "GET", route: "/api/health" });
    metrics.incrementCounter("http_request_count", { method: "GET", route: "/api/health" });
    metrics.setGauge("event_outbox_pending", 3, { event_type: "test.event" });
    metrics.observeHistogram("http_request_latency_ms", 10, { route: "/api/health" });
    metrics.observeHistogram("http_request_latency_ms", 30, { route: "/api/health" });

    expect(metrics.snapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "counter", name: "http_request_count", value: 2 }),
        expect.objectContaining({ kind: "gauge", name: "event_outbox_pending", value: 3 }),
        expect.objectContaining({
          count: 2,
          kind: "histogram",
          max: 30,
          min: 10,
          name: "http_request_latency_ms",
          sum: 40,
        }),
      ]),
    );
  });
});

describe("Health foundation", () => {
  it("merges healthy, degraded and unhealthy component states safely", async () => {
    const checker = new HealthChecker(
      [
        createStaticHealthProvider("application"),
        createStaticHealthProvider("worker", "degraded", "queue backlog is elevated"),
        createDatabaseHealthProvider(async () => {
          throw new Error("postgresql://user:password@internal/db stack");
        }),
      ],
      { now: () => NOW },
    );

    const report = await checker.check("readiness");

    expect(report.status).toBe("unhealthy");
    expect(report.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component: "application", status: "healthy" }),
        expect.objectContaining({ component: "worker", status: "degraded" }),
        expect.objectContaining({
          component: "database",
          message: "Health check failed",
          status: "unhealthy",
        }),
      ]),
    );
  });
});
