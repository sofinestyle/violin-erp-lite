export type IdempotencyScopeInput = Readonly<{
  apiId?: string;
  method?: string;
  pathTemplate?: string;
  userId: string;
}>;

function safeSegment(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes("|") || normalized.includes(":")) {
    throw new TypeError(`${name} is invalid`);
  }
  return normalized;
}

export class IdempotencyScopeResolver {
  resolve(input: IdempotencyScopeInput): string {
    const subject = safeSegment(input.userId, "authenticated user");
    const action = input.apiId
      ? safeSegment(input.apiId, "API action")
      : `${safeSegment(input.method ?? "", "HTTP method").toUpperCase()} ${safeSegment(
          input.pathTemplate ?? "",
          "path template",
        )}`;
    const scope = `subject:user:${subject}|action:${action}`;
    if (scope.length > 300) throw new TypeError("Idempotency scope exceeds the database limit");
    return scope;
  }
}
