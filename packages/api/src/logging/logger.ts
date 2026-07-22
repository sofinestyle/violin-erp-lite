import { getRequestContext } from "../request-context/request-context.js";

const SENSITIVE_FIELD_PATTERN = /authorization|cookie|database.?url|password|secret|stack|token/i;

export type LogLevel = "debug" | "error" | "info" | "warn";
export type LogValue = boolean | null | number | string | undefined;
export type LogFields = Readonly<Record<string, LogValue>>;

export type LogRecord = Readonly<{
  environment: string;
  event: string;
  fields: Readonly<Record<string, boolean | null | number | string>>;
  level: LogLevel;
  requestId?: string;
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

function sanitizeFields(fields: LogFields): Record<string, boolean | null | number | string> {
  return Object.fromEntries(
    Object.entries(fields)
      .filter((entry): entry is [string, Exclude<LogValue, undefined>] => entry[1] !== undefined)
      .map(([key, value]) => [key, SENSITIVE_FIELD_PATTERN.test(key) ? "[REDACTED]" : value]),
  );
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
    const baseRecord = {
      environment,
      event,
      fields: sanitizeFields(fields),
      level,
      service,
      timestamp: now().toISOString(),
    };
    const record: LogRecord = context
      ? { ...baseRecord, requestId: context.requestId }
      : baseRecord;

    sink(record);
  };

  return {
    debug: (event, fields) => write("debug", event, fields),
    error: (event, fields) => write("error", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
  };
}
