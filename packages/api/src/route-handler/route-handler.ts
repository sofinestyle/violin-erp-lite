import { normalizeError } from "../errors/app-error.js";
import { createLogger, type Logger } from "../logging/logger.js";
import { defaultMetricsRegistry, type MetricsRegistry } from "../observability/metrics.js";
import {
  createRequestContext,
  runWithRequestContext,
  type RequestContext,
} from "../request-context/request-context.js";
import { createErrorResponse } from "../response/api-response.js";

export type RouteHandler = (request: Request, context: RequestContext) => Promise<Response>;

export type RouteHandlerOptions = Readonly<{
  generateRequestId?: () => string;
  logger?: Logger;
  metrics?: MetricsRegistry;
  now?: () => Date;
}>;

const defaultLogger = createLogger();

function responseWithRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-ID", requestId);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function safePath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

export function createRouteHandler(
  handler: RouteHandler,
  options: RouteHandlerOptions = {},
): (request: Request) => Promise<Response> {
  return async (request) => {
    const context = createRequestContext(request, {
      ...(options.generateRequestId ? { generateRequestId: options.generateRequestId } : {}),
      ...(options.now ? { now: options.now } : {}),
    });
    const logger = options.logger ?? defaultLogger;
    const metrics = options.metrics ?? defaultMetricsRegistry;
    const path = safePath(request);
    const startedAt = Date.now();

    return runWithRequestContext(context, async () => {
      logger.info("http.request.started", { method: request.method, path });

      try {
        const response = responseWithRequestId(await handler(request, context), context.requestId);
        const statusClass = `${Math.floor(response.status / 100)}xx`;
        metrics.incrementCounter("http_request_count", {
          method: request.method,
          route: path,
          status_class: statusClass,
        });
        metrics.observeHistogram("http_request_latency_ms", Date.now() - startedAt, {
          method: request.method,
          route: path,
          status_class: statusClass,
        });
        logger.info("http.request.completed", {
          duration_ms: Date.now() - startedAt,
          method: request.method,
          path,
          status: response.status,
        });
        return response;
      } catch (error) {
        const appError = normalizeError(error);
        metrics.incrementCounter("http_request_count", {
          method: request.method,
          route: path,
          status_class: `${Math.floor(appError.httpStatus / 100)}xx`,
        });
        metrics.incrementCounter("http_error_count", {
          error_code: appError.code,
          method: request.method,
          route: path,
        });
        metrics.observeHistogram("http_request_latency_ms", Date.now() - startedAt, {
          method: request.method,
          route: path,
          status_class: `${Math.floor(appError.httpStatus / 100)}xx`,
        });
        logger.error("http.request.failed", {
          duration_ms: Date.now() - startedAt,
          errorCode: appError.code,
          method: request.method,
          path,
          status: appError.httpStatus,
        });
        return createErrorResponse(appError, context);
      }
    });
  };
}
