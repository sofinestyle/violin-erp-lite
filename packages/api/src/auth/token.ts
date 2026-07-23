import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import {
  InvalidRefreshTokenError,
  TokenExpiredError,
  UnauthorizedError,
} from "../errors/app-error.js";

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;
const MINIMUM_SECRET_LENGTH = 32;

export type ClientType = "pc" | "wechat-mini-program";

export type TokenClaims = Readonly<{
  clientType: ClientType;
  expiresAt: number;
  issuedAt: number;
  sessionId: string;
  tokenId: string;
  tokenFamilyId: string;
  tokenType: "access";
  userId: string;
}>;

export type JwtConfiguration = Readonly<{
  accessExpiresInSeconds: number;
  accessSecret: string;
  audience: string;
  issuer: string;
  refreshExpiresInSeconds: number;
  refreshPepper: string;
}>;

export type JwtEnvironment = Readonly<{
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  JWT_REFRESH_PEPPER?: string;
}>;

export type JwtServiceOptions = Readonly<{
  generateTokenId?: () => string;
  now?: () => Date;
}>;

function parseDuration(value: string | undefined, name: string): number {
  const match = value ? DURATION_PATTERN.exec(value) : null;

  if (!match) {
    throw new Error(`${name} must use a positive duration such as 15m or 7d`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1;

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${name} must be a positive duration`);
  }

  const seconds = amount * multiplier;

  if (!Number.isSafeInteger(seconds)) {
    throw new Error(`${name} is too large`);
  }

  return seconds;
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.startsWith("REPLACE_") || value.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`${name} must contain at least ${MINIMUM_SECRET_LENGTH} characters`);
  }

  return value;
}

export function loadJwtConfiguration(environment: JwtEnvironment): JwtConfiguration {
  const accessSecret = requireSecret(environment.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET");
  const refreshPepper = requireSecret(environment.JWT_REFRESH_PEPPER, "JWT_REFRESH_PEPPER");
  if (accessSecret === refreshPepper) {
    throw new Error("JWT access secret and refresh pepper must be different");
  }

  return {
    accessExpiresInSeconds: parseDuration(
      environment.JWT_ACCESS_EXPIRES_IN,
      "JWT_ACCESS_EXPIRES_IN",
    ),
    accessSecret,
    audience: "violin-erp-lite",
    issuer: "violin-erp-lite",
    refreshExpiresInSeconds: parseDuration(
      environment.JWT_REFRESH_EXPIRES_IN,
      "JWT_REFRESH_EXPIRES_IN",
    ),
    refreshPepper,
  };
}

function tokenError(error: unknown): Error {
  if (error instanceof joseErrors.JWTExpired) {
    return new TokenExpiredError();
  }
  return new UnauthorizedError();
}

export type AccessTokenInput = Readonly<{
  clientType: ClientType;
  sessionId: string;
  tokenFamilyId: string;
  userId: string;
}>;

export type IssuedRefreshToken = Readonly<{
  hash: string;
  token: string;
}>;

export class JwtService {
  readonly #configuration: JwtConfiguration;
  readonly #generateTokenId: () => string;
  readonly #now: () => Date;

  constructor(configuration: JwtConfiguration, options: JwtServiceOptions = {}) {
    requireSecret(configuration.accessSecret, "JWT_ACCESS_SECRET");
    requireSecret(configuration.refreshPepper, "JWT_REFRESH_PEPPER");
    if (configuration.accessSecret === configuration.refreshPepper) {
      throw new Error("JWT access secret and refresh pepper must be different");
    }

    this.#configuration = configuration;
    this.#generateTokenId = options.generateTokenId ?? randomUUID;
    this.#now = options.now ?? (() => new Date());
  }

  async signAccessToken(input: AccessTokenInput): Promise<string> {
    if (!input.userId || !input.sessionId || !input.tokenFamilyId) {
      throw new TypeError("Access Token identity claims are required");
    }
    const issuedAt = Math.floor(this.#now().getTime() / 1000);
    return new SignJWT({
      clientType: input.clientType,
      sessionId: input.sessionId,
      tokenFamilyId: input.tokenFamilyId,
      tokenType: "access",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(this.#configuration.issuer)
      .setAudience(this.#configuration.audience)
      .setSubject(input.userId)
      .setJti(this.#generateTokenId())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.#configuration.accessExpiresInSeconds)
      .sign(new TextEncoder().encode(this.#configuration.accessSecret));
  }

  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(48).toString("base64url");
    return Object.freeze({ hash: this.hashRefreshToken(token), token });
  }

  hashRefreshToken(token: string): string {
    if (!token || token.length > 512) {
      throw new InvalidRefreshTokenError();
    }
    return createHmac("sha256", this.#configuration.refreshPepper).update(token).digest("hex");
  }

  accessExpiresAt(): Date {
    return new Date(this.#now().getTime() + this.#configuration.accessExpiresInSeconds * 1000);
  }

  refreshExpiresAt(): Date {
    return new Date(this.#now().getTime() + this.#configuration.refreshExpiresInSeconds * 1000);
  }

  async verifyAccessToken(token: string): Promise<TokenClaims> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.#configuration.accessSecret),
        {
          algorithms: ["HS256"],
          audience: this.#configuration.audience,
          currentDate: this.#now(),
          issuer: this.#configuration.issuer,
        },
      );

      if (
        payload.tokenType !== "access" ||
        (payload.clientType !== "pc" && payload.clientType !== "wechat-mini-program") ||
        typeof payload.sessionId !== "string" ||
        typeof payload.tokenFamilyId !== "string" ||
        !payload.sub ||
        !payload.jti ||
        payload.iat === undefined ||
        payload.exp === undefined
      ) {
        throw new Error("Token claims are incomplete");
      }

      return Object.freeze({
        clientType: payload.clientType,
        expiresAt: payload.exp,
        issuedAt: payload.iat,
        sessionId: payload.sessionId,
        tokenId: payload.jti,
        tokenFamilyId: payload.tokenFamilyId,
        tokenType: "access",
        userId: payload.sub,
      });
    } catch (error) {
      throw tokenError(error);
    }
  }
}
