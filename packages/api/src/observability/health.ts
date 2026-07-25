export type HealthStatus = "degraded" | "healthy" | "unhealthy";
export type HealthCheckKind = "liveness" | "readiness";

export type ComponentHealth = Readonly<{
  checkedAt: string;
  component: string;
  durationMs: number;
  message?: string;
  status: HealthStatus;
}>;

export type HealthReport = Readonly<{
  checkedAt: string;
  components: readonly ComponentHealth[];
  durationMs: number;
  kind: HealthCheckKind;
  status: HealthStatus;
}>;

export type HealthProvider = Readonly<{
  check: () =>
    | Promise<Omit<ComponentHealth, "checkedAt" | "durationMs">>
    | Omit<ComponentHealth, "checkedAt" | "durationMs">;
  component: string;
}>;

export type HealthCheckerOptions = Readonly<{
  now?: () => Date;
}>;

function mergeStatus(statuses: readonly HealthStatus[]): HealthStatus {
  if (statuses.includes("unhealthy")) return "unhealthy";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

function safeMessage(error: unknown): string {
  if (!(error instanceof Error) || error.message.trim().length === 0) return "Health check failed";
  return /authorization|cookie|database.?url|password|secret|sql|stack|token/i.test(error.message)
    ? "Health check failed"
    : error.message.slice(0, 500);
}

export class HealthChecker {
  readonly #now: () => Date;
  readonly #providers: readonly HealthProvider[];

  constructor(providers: readonly HealthProvider[], options: HealthCheckerOptions = {}) {
    this.#providers = providers;
    this.#now = options.now ?? (() => new Date());
  }

  async check(kind: HealthCheckKind): Promise<HealthReport> {
    const startedAt = this.#now();
    const components: ComponentHealth[] = [];

    for (const provider of this.#providers) {
      const componentStartedAt = this.#now();
      try {
        const result = await provider.check();
        const completedAt = this.#now();
        components.push(
          Object.freeze({
            checkedAt: completedAt.toISOString(),
            component: result.component || provider.component,
            durationMs: Math.max(0, completedAt.getTime() - componentStartedAt.getTime()),
            ...(result.message === undefined ? {} : { message: result.message }),
            status: result.status,
          }),
        );
      } catch (error) {
        const completedAt = this.#now();
        components.push(
          Object.freeze({
            checkedAt: completedAt.toISOString(),
            component: provider.component,
            durationMs: Math.max(0, completedAt.getTime() - componentStartedAt.getTime()),
            message: safeMessage(error),
            status: "unhealthy",
          }),
        );
      }
    }

    const completedAt = this.#now();
    return Object.freeze({
      checkedAt: completedAt.toISOString(),
      components: Object.freeze(components),
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      kind,
      status: mergeStatus(components.map((component) => component.status)),
    });
  }
}

export function createStaticHealthProvider(
  component: string,
  status: HealthStatus = "healthy",
  message?: string,
): HealthProvider {
  return Object.freeze({
    check: () => ({
      component,
      ...(message === undefined ? {} : { message }),
      status,
    }),
    component,
  });
}

export function createDatabaseHealthProvider(checkDatabase: () => Promise<void>): HealthProvider {
  return Object.freeze({
    async check() {
      await checkDatabase();
      return { component: "database", status: "healthy" as const };
    },
    component: "database",
  });
}
