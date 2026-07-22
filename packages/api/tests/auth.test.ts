import { decodeJwt } from "jose";
import { describe, expect, it } from "vitest";
import {
  authenticateRequest,
  hashPassword,
  JwtService,
  loadJwtConfiguration,
  verifyPassword,
  type AuthenticatedUser,
} from "../src/index";

const ACCESS_SECRET = "access-secret-value-with-at-least-32-characters";
const REFRESH_SECRET = "refresh-secret-value-with-at-least-32-characters";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function configuration() {
  return loadJwtConfiguration({
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_EXPIRES_IN: "7d",
    JWT_REFRESH_SECRET: REFRESH_SECRET,
  });
}

describe("JWT foundation", () => {
  it("rejects placeholder or reused signing secrets", () => {
    expect(() =>
      loadJwtConfiguration({
        JWT_ACCESS_EXPIRES_IN: "15m",
        JWT_ACCESS_SECRET: "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS",
        JWT_REFRESH_EXPIRES_IN: "7d",
        JWT_REFRESH_SECRET: REFRESH_SECRET,
      }),
    ).toThrow("JWT_ACCESS_SECRET");
    expect(() =>
      loadJwtConfiguration({
        JWT_ACCESS_EXPIRES_IN: "15m",
        JWT_ACCESS_SECRET: ACCESS_SECRET,
        JWT_REFRESH_EXPIRES_IN: "7d",
        JWT_REFRESH_SECRET: ACCESS_SECRET,
      }),
    ).toThrow("must be different");
  });

  it("signs and verifies isolated access and refresh tokens", async () => {
    const service = new JwtService(configuration());
    const accessToken = await service.signAccessToken(USER_ID);
    const refreshToken = await service.signRefreshToken(USER_ID);

    await expect(service.verifyAccessToken(accessToken)).resolves.toMatchObject({
      tokenType: "access",
      userId: USER_ID,
    });
    await expect(service.verifyRefreshToken(refreshToken)).resolves.toMatchObject({
      tokenType: "refresh",
      userId: USER_ID,
    });
    await expect(service.verifyRefreshToken(accessToken)).rejects.toMatchObject({
      code: "AUTH_REFRESH_TOKEN_INVALID",
    });
    await expect(service.verifyAccessToken(refreshToken)).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });
  });

  it("keeps roles, permissions and sensitive data out of token claims", async () => {
    const service = new JwtService(configuration());
    const payload = decodeJwt(await service.signAccessToken(USER_ID));

    expect(payload).toMatchObject({ sub: USER_ID, tokenType: "access" });
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("roles");
    expect(payload).not.toHaveProperty("permissions");
  });

  it("rejects expired, tampered and wrong-key access tokens safely", async () => {
    const expiredSigner = new JwtService(configuration(), {
      now: () => new Date("2020-01-01T00:00:00.000Z"),
    });
    const expired = await expiredSigner.signAccessToken(USER_ID);
    await expect(new JwtService(configuration()).verifyAccessToken(expired)).rejects.toMatchObject({
      code: "AUTH_TOKEN_EXPIRED",
    });

    const service = new JwtService(configuration());
    const token = await service.signAccessToken(USER_ID);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    await expect(service.verifyAccessToken(tampered)).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });

    const wrongKeyService = new JwtService({
      ...configuration(),
      accessSecret: "different-access-secret-with-at-least-32-characters",
    });
    await expect(wrongKeyService.verifyAccessToken(token)).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });
  });

  it("loads the current user on every authenticated request", async () => {
    const service = new JwtService(configuration());
    const token = await service.signAccessToken(USER_ID);
    const user: AuthenticatedUser = {
      dataScopes: ["self_created"],
      permissionCodes: ["purchase.order.read"],
      roleCodes: ["purchaser"],
      userId: USER_ID,
      username: "buyer",
    };
    const context = await authenticateRequest(
      new Request("http://localhost/api/test", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      service,
      async () => user,
    );

    expect(context.user).toBe(user);
  });
});

describe("password foundation", () => {
  it("hashes with scrypt and verifies without exposing plaintext", async () => {
    const password = "correct horse battery staple";
    const encoded = await hashPassword(password);

    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", encoded)).resolves.toBe(false);
    await expect(verifyPassword(password, "invalid-hash")).resolves.toBe(false);
  });
});
