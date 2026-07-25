export type IdempotencyJson =
  | boolean
  | null
  | number
  | string
  | readonly IdempotencyJson[]
  | { readonly [key: string]: IdempotencyJson };

export type IdempotencyStatus = "completed" | "failed" | "processing";

export type IdempotencySafeResponse = Readonly<{
  body: IdempotencyJson;
  httpStatus: number;
  requestTraceId: string;
  resourceId?: string;
  resourceType?: string;
}>;

export type IdempotencyRecord = Readonly<{
  completedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  idempotencyKeyHash: string;
  lockedUntil: Date | null;
  requestHash: string;
  requestTraceId: string;
  response: IdempotencySafeResponse | null;
  scopeCode: string;
  status: IdempotencyStatus;
  updatedAt: Date;
}>;

export type IdempotencyClaimInput = Readonly<{
  expiresAt: Date;
  idempotencyKeyHash: string;
  lockedUntil: Date;
  now: Date;
  requestHash: string;
  requestTraceId: string;
  scopeCode: string;
}>;

export type IdempotencyClaimResult =
  | Readonly<{ kind: "claimed"; record: IdempotencyRecord }>
  | Readonly<{ kind: "existing"; record: IdempotencyRecord }>;

export type IdempotencyTerminalInput = Readonly<{
  id: string;
  now: Date;
  ownerTraceId: string;
  requestHash: string;
  response: IdempotencySafeResponse;
}>;

export type IdempotencyExpiredTerminalInput = Readonly<{
  id: string;
  now: Date;
  requestHash: string;
  response: IdempotencySafeResponse;
}>;

export type IdempotencyReclaimInput = Readonly<{
  id: string;
  lockedUntil: Date;
  now: Date;
  requestHash: string;
  requestTraceId: string;
}>;

export interface IdempotencyRepository {
  claim(input: IdempotencyClaimInput): Promise<IdempotencyClaimResult>;
  complete(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null>;
  fail(input: IdempotencyTerminalInput): Promise<IdempotencyRecord | null>;
  find(scopeCode: string, idempotencyKeyHash: string): Promise<IdempotencyRecord | null>;
  finalizeExpired(
    status: Exclude<IdempotencyStatus, "processing">,
    input: IdempotencyExpiredTerminalInput,
  ): Promise<IdempotencyRecord | null>;
  reclaimExpired(input: IdempotencyReclaimInput): Promise<IdempotencyRecord | null>;
  removeExpiredTerminalRecords(before: Date, limit: number): Promise<number>;
}

export type IdempotencyExecutionResult = Readonly<{
  outcome: "completed" | "failed";
  response: IdempotencySafeResponse;
}>;

export type IdempotencyReconciliationResult =
  IdempotencyExecutionResult | Readonly<{ outcome: "retry" }> | Readonly<{ outcome: "unresolved" }>;

export interface IdempotencyReconciliationStrategy {
  reconcileExpiredProcessing(record: IdempotencyRecord): Promise<IdempotencyReconciliationResult>;
}
