// CR-009 Project Owner approval, 2026-09-08. Run with Node 22 --env-file=.env.
// Uses the formal authenticated identity and repository scope mechanism, then HTTP disable.
import { randomUUID } from "node:crypto";
import {
  createPrismaClient,
  createCurrentUserResolver,
  PrismaMasterDataRepository,
} from "../../packages/database/dist/index.js";
if (!process.argv.includes("--approved-cr-009")) throw new Error("CR_009_APPROVAL_FLAG_REQUIRED");
const db = createPrismaClient(process.env.DATABASE_URL);
let token;
async function api(path, method = "GET", body) {
  const response = await fetch(`http://localhost:3100/api/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "pc",
      "Idempotency-Key": randomUUID(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error?.code ?? "API_FAILED");
  return result.data;
}
try {
  token = (
    await api("auth/login", "POST", {
      loginType: "password",
      username: process.env.CODE_GENERATION_UAT_USERNAME,
      password: process.env.CODE_GENERATION_UAT_PASSWORD,
    })
  ).accessToken;
  const session = await api("auth/session");
  const user = await createCurrentUserResolver(db)(session.userId);
  if (!user) throw new Error("AUTHENTICATION_REQUIRED");
  const requestId = randomUUID();
  const id = await new PrismaMasterDataRepository(db).repairApprovedDiagnosticWarehouse(
    { user },
    { requestId, requestTraceId: requestId, timestamp: new Date().toISOString() },
  );
  const current = await api(`warehouses/${id}`);
  if (current.isActive)
    await api(`warehouses/${id}/disable`, "POST", {
      updatedAt: current.updatedAt,
      reason: "CR-009 批准：WH-000009 仅为本轮诊断数据，验证后正式停用",
    });
  const result = await api(`warehouses/${id}`);
  const audit = await db.audit_logs.count({
    where: { object_id: id, action_code: { in: ["initialize-scope", "disable"] } },
  });
  if (result.isActive || audit < 2) throw new Error("DIAGNOSTIC_CLEANUP_VERIFICATION_FAILED");
  console.log(
    JSON.stringify({
      warehouseCode: "WH-000009",
      scope: "formal-initialization",
      status: "disabled",
      audit: "verified",
      physicalDelete: false,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      errorType: error?.name ?? "Error",
      code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : "MAINTENANCE_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
