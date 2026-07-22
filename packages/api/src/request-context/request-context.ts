import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export type RequestContext = Readonly<{
  requestId: string;
  timestamp: string;
}>;

export type RequestContextOptions = Readonly<{
  generateRequestId?: () => string;
  now?: () => Date;
}>;

export function isValidRequestId(value: string | null): value is string {
  return value !== null && REQUEST_ID_PATTERN.test(value);
}

export function createRequestContext(
  request: Request,
  options: RequestContextOptions = {},
): RequestContext {
  const candidate = request.headers.get("X-Request-ID");
  const requestId = isValidRequestId(candidate)
    ? candidate
    : (options.generateRequestId ?? randomUUID)();
  const timestamp = (options.now ?? (() => new Date()))().toISOString();

  return Object.freeze({ requestId, timestamp });
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
