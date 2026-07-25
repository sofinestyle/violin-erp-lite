import {
  IdempotencyAdapter,
  loadIdempotencyConfiguration,
  type IdempotencyAdapterDependencies,
} from "@violin-erp/api";
import { getPrismaClient } from "../client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaIdempotencyRepository } from "./prisma-idempotency-repository.js";

export function createPersistentIdempotencyAdapter(
  environment: NodeJS.ProcessEnv = process.env,
  client: PrismaClient = getPrismaClient(),
  dependencies: IdempotencyAdapterDependencies = {},
): IdempotencyAdapter {
  return new IdempotencyAdapter(
    new PrismaIdempotencyRepository(client),
    loadIdempotencyConfiguration(environment),
    dependencies,
  );
}
