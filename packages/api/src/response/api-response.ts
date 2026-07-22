import type { AppError } from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";

export type ErrorDetail = Readonly<{
  code?: string;
  field?: string;
  line?: number;
  message: string;
}>;

export type ApiSuccessResponse<T, M extends object = Record<string, never>> = Readonly<{
  success: true;
  data: T;
  meta: M;
  requestId: string;
  timestamp: string;
}>;

export type ApiErrorResponse = Readonly<{
  success: false;
  error: Readonly<{
    code: string;
    message: string;
    details: readonly ErrorDetail[];
  }>;
  requestId: string;
  timestamp: string;
}>;

export type ResponseOptions<M extends object> = Readonly<{
  headers?: HeadersInit;
  meta?: M;
  status?: number;
}>;

function jsonResponse(body: unknown, requestId: string, init: ResponseInit): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Request-ID", requestId);

  return new Response(JSON.stringify(body), { ...init, headers });
}

export function createSuccessResponse<T, M extends object = Record<string, never>>(
  data: T,
  context: RequestContext,
  options: ResponseOptions<M> = {},
): Response {
  const body: ApiSuccessResponse<T, M | Record<string, never>> = {
    success: true,
    data,
    meta: options.meta ?? {},
    requestId: context.requestId,
    timestamp: context.timestamp,
  };

  const responseInit: ResponseInit = { status: options.status ?? 200 };

  if (options.headers) {
    responseInit.headers = options.headers;
  }

  return jsonResponse(body, context.requestId, responseInit);
}

export function createErrorResponse(error: AppError, context: RequestContext): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.expose ? error.message : "系统异常，请稍后重试",
      details: error.expose ? error.details : [],
    },
    requestId: context.requestId,
    timestamp: context.timestamp,
  };

  return jsonResponse(body, context.requestId, { status: error.httpStatus });
}
