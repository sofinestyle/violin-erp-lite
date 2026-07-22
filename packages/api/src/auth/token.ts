import { randomUUID } from "node:crypto";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import {
  InvalidRefreshTokenError,
  TokenExpiredError,
  UnauthorizedError,
} from "../errors/app-error.js";

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;
const MINIMUM_SECRET_LENGTH = 32;

export type TokenType = "access" | "refresh";

export type TokenClaims = Readonly<{
  expiresAt: number;
  issuedAt: number;
  tokenId: string;
  tokenType: TokenType;
  userId: string;
}>;

export type JwtConfiguration = Readonly<{
  accessExpiresInSeconds: number;
  accessSecret: string;
  audience: string;
  issuer: string;
  refreshExpiresInSeconds: number;
  refreshSecret: string;
}>;

export type JwtEnvironment = Readonly<{
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET?: string;
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
  const refreshSecret = requireSecret(environment.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET");

  if (accessSecret === refreshSecret) {
    throw new Error("JWT access and refresh secrets must be different");
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
    refreshSecret,
  };
}

function tokenError(tokenType: TokenType, error: unknown): Error {
  if (tokenType === "access" && error instanceof joseErrors.JWTExpired) {
    return new TokenExpiredError();
  }

  if (tokenType === "refresh") {
    return new InvalidRefreshTokenError();
  }

  return new UnauthorizedError();
}

export class JwtService {
  readonly #configuration: JwtConfiguration;
  readonly #generateTokenId: () => string;
  readonly #now: () => Date;

  constructor(configuration: JwtConfiguration, options: JwtServiceOptions = {}) {
    requireSecret(configuration.accessSecret, "JWT_ACCESS_SECRET");
    requireSecret(configuration.refreshSecret, "JWT_REFRESH_SECRET");

    if (configuration.accessSecret === configuration.refreshSecret) {
      throw new Error("JWT access and refresh secrets must be different");
    }

    this.#configuration = configuration;
    this.#generateTokenId = options.generateTokenId ?? randomUUID;
    this.#now = options.now ?? (() => new Date());
  }

  async signAccessToken(userId: string): Promise<string> {
    return this.#sign(userId, "access");
  }

  async signRefreshToken(userId: string): Promise<string> {
    return this.#sign(userId, "refresh");
  }

  async verifyAccessToken(token: string): Promise<TokenClaims> {
    return this.#verify(token, "access");
  }

  async verifyRefreshToken(token: string): Promise<TokenClaims> {
    return this.#verify(token, "refresh");
  }

  async #sign(userId: string, tokenType: TokenType): Promise<string> {
    if (!userId) {
      throw new TypeError("userId is required");
    }

    const issuedAt = Math.floor(this.#now().getTime() / 1000);
    const expiresIn =
      tokenType === "access"
        ? this.#configuration.accessExpiresInSeconds
        : this.#configuration.refreshExpiresInSeconds;
    const secret =
      tokenType === "access" ? this.#configuration.accessSecret : this.#configuration.refreshSecret;

    return new SignJWT({ tokenType })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(this.#configuration.issuer)
      .setAudience(this.#configuration.audience)
      .setSubject(userId)
      .setJti(this.#generateTokenId())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + expiresIn)
      .sign(new TextEncoder().encode(secret));
  }

  async #verify(token: string, expectedType: TokenType): Promise<TokenClaims> {
    try {
      const secret =
        expectedType === "access"
          ? this.#configuration.accessSecret
          : this.#configuration.refreshSecret;
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
        audience: this.#configuration.audience,
        currentDate: this.#now(),
        issuer: this.#configuration.issuer,
      });

      if (
        payload.tokenType !== expectedType ||
        !payload.sub ||
        !payload.jti ||
        payload.iat === undefined ||
        payload.exp === undefined
      ) {
        throw new Error("Token claims are incomplete");
      }

      return Object.freeze({
        expiresAt: payload.exp,
        issuedAt: payload.iat,
        tokenId: payload.jti,
        tokenType: expectedType,
        userId: payload.sub,
      });
    } catch (error) {
      throw tokenError(expectedType, error);
    }
  }
}
