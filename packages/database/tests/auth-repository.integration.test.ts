import { randomUUID } from "node:crypto";
import {
  AuthenticationService,
  JwtService,
  loadJwtConfiguration,
  type WechatIdentity,
  type WechatIdentityAdapter,
} from "@violin-erp/api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/client";
import { PrismaAuthRepository } from "../src/auth/prisma-auth-repository";

const databaseUrl = process.env.AUTH_INTEGRATION_DATABASE_URL;
const username = process.env.AUTH_INTEGRATION_USERNAME;
const password = process.env.AUTH_INTEGRATION_PASSWORD;
const integration = databaseUrl && username && password ? describe : describe.skip;
const client = databaseUrl ? createPrismaClient(databaseUrl) : null;
const repository = client ? new PrismaAuthRepository(client) : null;

class MutableWechatAdapter implements WechatIdentityAdapter {
  identity: WechatIdentity = { openid: "integration-openid-1", unionid: "integration-unionid-1" };
  async exchange(): Promise<WechatIdentity> {
    return this.identity;
  }
}

const wechat = new MutableWechatAdapter();
const jwt = new JwtService(
  loadJwtConfiguration({
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_ACCESS_SECRET: "integration-access-secret-at-least-32-characters",
    JWT_REFRESH_EXPIRES_IN: "7d",
    JWT_REFRESH_PEPPER: "integration-refresh-pepper-at-least-32-characters",
  }),
);

function requestContext() {
  return { requestId: randomUUID(), timestamp: new Date().toISOString() };
}

function service() {
  return new AuthenticationService(repository!, jwt, wechat, "integration-app-id");
}

integration("Prisma unified authentication integration", () => {
  beforeAll(async () => {
    await client!.users.updateMany({
      data: { must_change_password: false },
      where: { username },
    });
  });
  afterAll(async () => {
    await client?.$disconnect();
  });

  it("persists password login, restores the session and loads current RBAC", async () => {
    const tokens = await service().login(
      { loginType: "password", password: password!, username: username! },
      "pc",
      requestContext(),
    );
    const claims = await jwt.verifyAccessToken(tokens.accessToken);
    const current = await repository!.resolveSession(claims, "pc");

    expect(current?.user.username).toBe(username);
    expect(current?.user.permissions).toHaveLength(244);
    expect(current?.session.sessionId).toBe(claims.sessionId);
  });

  it("allows only one concurrent rotation and replay revokes the whole family", async () => {
    const login = await service().login(
      { loginType: "password", password: password!, username: username! },
      "pc",
      requestContext(),
    );
    const results = await Promise.allSettled([
      service().refresh(login.refreshToken, "pc", requestContext()),
      service().refresh(login.refreshToken, "pc", requestContext()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: { code: "AUTH_REFRESH_TOKEN_REPLAY" },
      status: "rejected",
    });

    const oldClaims = await jwt.verifyAccessToken(login.accessToken);
    const family = await client!.auth_sessions.findMany({
      where: { token_family_id: oldClaims.tokenFamilyId },
    });
    expect(family.filter((row) => row.replaced_by_session_id)).toHaveLength(1);
    expect(family.every((row) => row.revoked_at !== null)).toBe(true);
  });

  it("revokes only the current family and keeps logout idempotent", async () => {
    const first = await service().login(
      { loginType: "password", password: password!, username: username! },
      "pc",
      requestContext(),
    );
    const second = await service().login(
      { loginType: "password", password: password!, username: username! },
      "pc",
      requestContext(),
    );
    const firstClaims = await jwt.verifyAccessToken(first.accessToken);
    const secondClaims = await jwt.verifyAccessToken(second.accessToken);

    await service().logout(firstClaims, first.refreshToken, requestContext());
    await service().logout(firstClaims, first.refreshToken, requestContext());

    expect(await repository!.resolveSession(firstClaims, "pc")).toBeNull();
    expect(await repository!.resolveSession(secondClaims, "pc")).not.toBeNull();
  });

  it("binds WeChat atomically, auto logs in and enforces mapping uniqueness", async () => {
    const bound = await service().login(
      {
        loginType: "wechat-bind",
        password: password!,
        username: username!,
        wechatCode: "mock-code",
      },
      "wechat-mini-program",
      requestContext(),
    );
    expect(bound.session.wechatBound).toBe(true);

    const automatic = await service().login(
      { loginType: "wechat", wechatCode: "mock-code-2" },
      "wechat-mini-program",
      requestContext(),
    );
    expect(automatic.session.userId).toBe(bound.session.userId);

    await expect(
      service().login(
        {
          loginType: "wechat-bind",
          password: password!,
          username: username!,
          wechatCode: "mock-code-3",
        },
        "wechat-mini-program",
        requestContext(),
      ),
    ).rejects.toMatchObject({ code: "AUTH_WECHAT_ALREADY_BOUND" });
  });

  it("rolls back a binding when session persistence fails", async () => {
    const target = await repository!.findUserByUsername(username!);
    expect(target).not.toBeNull();
    const identity = {
      openid: "integration-rollback-openid",
      unionid: "integration-rollback-unionid",
    };
    const now = new Date();
    await expect(
      repository!.bindWechatAndCreateSession(target!.id, identity, "integration-app-id", {
        accessTokenExpiresAt: new Date(now.getTime() + 60_000),
        clientType: "wechat-mini-program",
        issuedAt: now,
        refreshTokenExpiresAt: new Date(now.getTime() + 30_000),
        refreshTokenHash: "integration-invalid-session-hash",
        requestId: randomUUID(),
        sessionId: randomUUID(),
        tokenFamilyId: randomUUID(),
        userId: target!.id,
        username: target!.username,
      }),
    ).rejects.toBeTruthy();
    expect(await client!.user_wechat_identities.count({ where: { openid: identity.openid } })).toBe(
      0,
    );
  });

  it("rejects refresh immediately after the user is disabled", async () => {
    const login = await service().login(
      { loginType: "password", password: password!, username: username! },
      "pc",
      requestContext(),
    );
    const target = await repository!.findUserByUsername(username!);
    await client!.users.update({
      data: {
        disabled_at: new Date(),
        disabled_by: target!.id,
        is_active: false,
        status: "disabled",
      },
      where: { id: target!.id },
    });
    const claims = await jwt.verifyAccessToken(login.accessToken);
    await expect(repository!.resolveSession(claims, "pc")).resolves.toBeNull();
    await expect(
      service().refresh(login.refreshToken, "pc", requestContext()),
    ).rejects.toMatchObject({ code: "AUTH_USER_DISABLED" });
    await client!.users.update({
      data: {
        disabled_at: null,
        disabled_by: null,
        is_active: true,
        status: "active",
      },
      where: { id: target!.id },
    });
  });
});
