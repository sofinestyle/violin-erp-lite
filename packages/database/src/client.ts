import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const globalPrisma = globalThis as typeof globalThis & {
  __violinErpLitePrisma?: PrismaClient;
};

function requireDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client");
  }

  return databaseUrl;
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl(databaseUrl) });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!globalPrisma.__violinErpLitePrisma) {
    globalPrisma.__violinErpLitePrisma = createPrismaClient(requireDatabaseUrl(databaseUrl));
  }

  return globalPrisma.__violinErpLitePrisma;
}

export async function checkDatabaseConnection(): Promise<void> {
  await getPrismaClient().$queryRaw`SELECT 1`;
}
