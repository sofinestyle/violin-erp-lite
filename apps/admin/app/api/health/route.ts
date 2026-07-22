import { createHealthCheckHandler } from "@violin-erp/api";
import { checkDatabaseConnection } from "@violin-erp/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = createHealthCheckHandler({
  checkDatabase: checkDatabaseConnection,
});
