import { AuditUnavailableError } from "../errors/app-error.js";

export type AuditPrimitive = boolean | null | number | string;
export type AuditValue = AuditPrimitive | AuditValue[] | { [key: string]: AuditValue };

type AuditEventBase = Readonly<{
  action: string;
  actorUserId?: string;
  afterSnapshot?: unknown;
  beforeSnapshot?: unknown;
  ipAddress?: string;
  metadata?: unknown;
  moduleCode: string;
  requestId: string;
  resourceId: string;
  resourceNoSnapshot?: string;
  resourceType: string;
  timestamp: Date;
  userAgent?: string;
  usernameSnapshot?: string;
}>;

export type AuditEvent = AuditEventBase &
  (
    | Readonly<{ failureReason: string; result: "failure" }>
    | Readonly<{ failureReason?: never; result: "success" }>
  );

export type SanitizedAuditEvent = Omit<
  AuditEvent,
  "afterSnapshot" | "beforeSnapshot" | "metadata"
> &
  Readonly<{
    afterSnapshot?: AuditValue;
    beforeSnapshot?: AuditValue;
    metadata?: AuditValue;
  }>;

export type AuditWriter = Readonly<{
  write: (event: SanitizedAuditEvent) => Promise<void>;
}>;

export type AuditFailureMode = "best-effort" | "required";

export type RecordAuditOptions = Readonly<{
  failureMode?: AuditFailureMode;
  onFailure?: () => void;
}>;

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "address",
  "authorization",
  "bankaccount",
  "binary",
  "connectionstring",
  "contact",
  "cookie",
  "databaseurl",
  "email",
  "filebuffer",
  "jwtaccesssecret",
  "jwtrefreshsecret",
  "mobile",
  "password",
  "passwordhash",
  "phone",
  "rawbinary",
  "refreshtoken",
  "secret",
  "token",
]);
const SENSITIVE_STRING_PATTERN =
  /(?:postgres(?:ql)?:\/\/|bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;
const SENSITIVE_FAILURE_PATTERN =
  /(?:authorization|cookie|database|password|secret|server path|sql|stack|token)/i;

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function sanitize(value: unknown, ancestors: WeakSet<object>): AuditValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return SENSITIVE_STRING_PATTERN.test(value) ? "[REDACTED]" : value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Uint8Array) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      return "[REDACTED]";
    }

    ancestors.add(value);
    const result = value.map((item) => sanitize(item, ancestors));
    ancestors.delete(value);
    return result;
  }

  if (typeof value === "object") {
    if (ancestors.has(value)) {
      return "[REDACTED]";
    }

    ancestors.add(value);
    const result: Record<string, AuditValue> = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = SENSITIVE_KEYS.has(normalizeKey(key))
        ? "[REDACTED]"
        : sanitize(item, ancestors);
    }

    ancestors.delete(value);
    return result;
  }

  return "[REDACTED]";
}

export function sanitizeAuditValue(value: unknown): AuditValue {
  return sanitize(value, new WeakSet());
}

export function sanitizeAuditEvent(event: AuditEvent): SanitizedAuditEvent {
  const { afterSnapshot, beforeSnapshot, metadata, ...baseEvent } = event;
  const safeBaseEvent =
    baseEvent.result === "failure" && SENSITIVE_FAILURE_PATTERN.test(baseEvent.failureReason)
      ? { ...baseEvent, failureReason: "操作失败" }
      : baseEvent;

  return Object.freeze({
    ...safeBaseEvent,
    ...(beforeSnapshot === undefined ? {} : { beforeSnapshot: sanitizeAuditValue(beforeSnapshot) }),
    ...(afterSnapshot === undefined ? {} : { afterSnapshot: sanitizeAuditValue(afterSnapshot) }),
    ...(metadata === undefined ? {} : { metadata: sanitizeAuditValue(metadata) }),
  });
}

export async function recordAuditEvent(
  writer: AuditWriter,
  event: AuditEvent,
  options: RecordAuditOptions = {},
): Promise<boolean> {
  try {
    await writer.write(sanitizeAuditEvent(event));
    return true;
  } catch {
    options.onFailure?.();

    if ((options.failureMode ?? "required") === "required") {
      throw new AuditUnavailableError();
    }

    return false;
  }
}

export class InMemoryAuditWriter implements AuditWriter {
  readonly events: SanitizedAuditEvent[] = [];
  readonly #failure: Error | undefined;

  constructor(failure?: Error) {
    this.#failure = failure;
  }

  async write(event: SanitizedAuditEvent): Promise<void> {
    if (this.#failure) {
      throw this.#failure;
    }

    this.events.push(event);
  }
}
