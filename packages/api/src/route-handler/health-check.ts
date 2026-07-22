import { ServiceUnavailableError } from "../errors/app-error.js";
import { createSuccessResponse } from "../response/api-response.js";
import { createRouteHandler, type RouteHandlerOptions } from "./route-handler.js";

export type HealthCheckDependencies = Readonly<{
  checkDatabase: () => Promise<void>;
  routeHandlerOptions?: RouteHandlerOptions;
}>;

export function createHealthCheckHandler({
  checkDatabase,
  routeHandlerOptions,
}: HealthCheckDependencies): (request: Request) => Promise<Response> {
  return createRouteHandler(async (_request, context) => {
    try {
      await checkDatabase();
    } catch {
      throw new ServiceUnavailableError();
    }

    return createSuccessResponse(
      {
        application: { status: "ok" },
        database: { status: "connected" },
      },
      context,
    );
  }, routeHandlerOptions);
}
