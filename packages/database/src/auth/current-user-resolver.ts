import {
  createAuthenticatedUser,
  type AuthenticatedUser,
  type CurrentUserResolver,
} from "@violin-erp/api";
import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaAuthRepository } from "./prisma-auth-repository.js";

export function createCurrentUserResolver(client?: PrismaClient): CurrentUserResolver {
  return async (userId): Promise<AuthenticatedUser | null> => {
    const user = await new PrismaAuthRepository(client).resolveCurrentUser(userId);
    if (!user) return null;
    return createAuthenticatedUser(user);
  };
}
