import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export type RequestContext = Readonly<{
  actorUserId?: string;
  consumerId?: string;
  eventId?: string;
  jobAttemptId?: string;
  jobId?: string;
  requestId: string;
  requestTraceId: string;
  service?: string;
  timestamp: string;
}>;

export type RequestContextOptions = Readonly<{
  generateRequestId?: () => string;
  now?: () => Date;
  service?: string;
}>;

export type TraceContextInput = Readonly<{
  actorUserId?: string;
  consumerId?: string;
  eventId?: string;
  jobAttemptId?: string;
  jobId?: string;
  requestTraceId: string;
  service?: string;
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

  return Object.freeze({
    requestId,
    requestTraceId: requestId,
    ...(options.service === undefined ? {} : { service: options.service }),
    timestamp,
  });
}

export function createTraceContext(
  input: TraceContextInput,
  options: RequestContextOptions = {},
): RequestContext {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();

  return Object.freeze({
    ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
    ...(input.consumerId === undefined ? {} : { consumerId: input.consumerId }),
    ...(input.eventId === undefined ? {} : { eventId: input.eventId }),
    ...(input.jobAttemptId === undefined ? {} : { jobAttemptId: input.jobAttemptId }),
    ...(input.jobId === undefined ? {} : { jobId: input.jobId }),
    requestId: input.requestTraceId,
    requestTraceId: input.requestTraceId,
    ...((input.service ?? options.service) ? { service: input.service ?? options.service } : {}),
    timestamp,
  });
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestTraceId(): string | undefined {
  return getRequestContext()?.requestTraceId;
}
