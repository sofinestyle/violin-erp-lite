import { getRequestContext } from "../request-context/request-context.js";

const SENSITIVE_FIELD_PATTERN =
  /authorization|cookie|database.?url|password|private.?path|secret|stack|storage.?key|token/i;
const SENSITIVE_STRING_PATTERN =
  /(?:postgres(?:ql)?:\/\/|bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\/(?:private|storage)\/[^\s]+)/i;

export type LogLevel = "debug" | "error" | "info" | "warn";
export type LogPrimitive = boolean | null | number | string;
export type LogValue =
  LogPrimitive | LogValue[] | { readonly [key: string]: LogValue | undefined } | undefined;
export type LogFields = Readonly<Record<string, LogValue>>;
export type LogContext = Readonly<Record<string, Exclude<LogValue, undefined>>>;

export type LogRecord = Readonly<{
  consumer_id?: string;
  context?: LogContext;
  duration_ms?: number;
  environment: string;
  error_code?: string;
  event: string;
  event_id?: string;
  fields: LogContext;
  job_id?: string;
  level: LogLevel;
  requestId?: string;
  request_trace_id?: string;
  service: string;
  timestamp: string;
}>;

export type Logger = Readonly<{
  debug: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
}>;

export type LoggerOptions = Readonly<{
  environment?: string;
  now?: () => Date;
  service?: string;
  sink?: (record: LogRecord) => void;
}>;

function sanitizeValue(value: Exclude<LogValue, undefined>, ancestors: WeakSet<object>): LogValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    return SENSITIVE_STRING_PATTERN.test(value) ? "[REDACTED]" : value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return "[REDACTED]";
    ancestors.add(value);
    const result = value
      .filter((item): item is Exclude<LogValue, undefined> => item !== undefined)
      .map((item) => sanitizeValue(item, ancestors));
    ancestors.delete(value);
    return result;
  }
  if (typeof value === "object") {
    if (ancestors.has(value)) return "[REDACTED]";
    ancestors.add(value);
    const result: Record<string, Exclude<LogValue, undefined>> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      result[key] = SENSITIVE_FIELD_PATTERN.test(key)
        ? "[REDACTED]"
        : (sanitizeValue(item, ancestors) as Exclude<LogValue, undefined>);
    }
    ancestors.delete(value);
    return result;
  }

  return "[REDACTED]";
}

function sanitizeFields(fields: LogFields): LogContext {
  return Object.fromEntries(
    Object.entries(fields)
      .filter((entry): entry is [string, Exclude<LogValue, undefined>] => entry[1] !== undefined)
      .map(([key, value]) => [
        key,
        SENSITIVE_FIELD_PATTERN.test(key)
          ? "[REDACTED]"
          : (sanitizeValue(value, new WeakSet()) as Exclude<LogValue, undefined>),
      ]),
  );
}

function optionalString(value: LogValue): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: LogValue): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractContextFields(
  fields: LogContext,
): Pick<
  LogRecord,
  "consumer_id" | "duration_ms" | "error_code" | "event_id" | "job_id" | "request_trace_id"
> {
  const consumerId = optionalString(fields.consumer_id ?? fields.consumerId);
  const durationMs = optionalNumber(fields.duration_ms ?? fields.durationMs);
  const errorCode = optionalString(fields.error_code ?? fields.errorCode);
  const eventId = optionalString(fields.event_id ?? fields.eventId);
  const jobId = optionalString(fields.job_id ?? fields.jobId);
  const requestTraceId = optionalString(fields.request_trace_id ?? fields.requestTraceId);

  return {
    ...(consumerId === undefined ? {} : { consumer_id: consumerId }),
    ...(durationMs === undefined ? {} : { duration_ms: durationMs }),
    ...(errorCode === undefined ? {} : { error_code: errorCode }),
    ...(eventId === undefined ? {} : { event_id: eventId }),
    ...(jobId === undefined ? {} : { job_id: jobId }),
    ...(requestTraceId === undefined ? {} : { request_trace_id: requestTraceId }),
  };
}

function defaultSink(record: LogRecord): void {
  const serialized = JSON.stringify(record);

  if (record.level === "error") {
    console.error(serialized);
    return;
  }

  if (record.level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const environment = options.environment ?? process.env.NODE_ENV ?? "development";
  const now = options.now ?? (() => new Date());
  const service = options.service ?? "violin-erp-api";
  const sink = options.sink ?? defaultSink;

  const write = (level: LogLevel, event: string, fields: LogFields = {}): void => {
    const context = getRequestContext();
    const safeFields = sanitizeFields(fields);
    const extracted = extractContextFields(safeFields);
    const baseRecord = {
      environment,
      event,
      fields: safeFields,
      level,
      service,
      timestamp: now().toISOString(),
    };
    const record: LogRecord = {
      ...baseRecord,
      ...(context
        ? {
            ...(context.consumerId === undefined ? {} : { consumer_id: context.consumerId }),
            ...(context.eventId === undefined ? {} : { event_id: context.eventId }),
            ...(context.jobId === undefined ? {} : { job_id: context.jobId }),
            requestId: context.requestId,
            request_trace_id: context.requestTraceId,
          }
        : {}),
      ...extracted,
    };

    sink(record);
  };

  return {
    debug: (event, fields) => write("debug", event, fields),
    error: (event, fields) => write("error", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
  };
}
