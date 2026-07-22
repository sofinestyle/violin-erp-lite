export type HealthResult = Readonly<{
  requestId: string;
  applicationStatus: "ok";
  databaseStatus: "connected";
}>;

type HealthEnvelope = {
  success?: unknown;
  requestId?: unknown;
  data?: {
    application?: { status?: unknown };
    database?: { status?: unknown };
  };
};

export async function fetchHealth(
  endpoint: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<HealthResult> {
  const requestInit: RequestInit = {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(signal ? { signal } : {}),
  };
  const response = await fetcher(endpoint, requestInit);

  const body = (await response.json()) as HealthEnvelope;
  if (
    !response.ok ||
    body.success !== true ||
    typeof body.requestId !== "string" ||
    body.data?.application?.status !== "ok" ||
    body.data.database?.status !== "connected"
  ) {
    throw new Error("HEALTH_CHECK_FAILED");
  }

  return {
    requestId: body.requestId,
    applicationStatus: "ok",
    databaseStatus: "connected",
  };
}
