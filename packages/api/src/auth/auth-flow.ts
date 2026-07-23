import { randomUUID } from "node:crypto";
import type { PermissionCode, RoleCode } from "../authorization/permissions.js";
import {
  AppError,
  InvalidRefreshTokenError,
  ValidationError,
  authenticationError,
  securityError,
} from "../errors/app-error.js";
import type { RequestContext } from "../request-context/request-context.js";
import { verifyPassword } from "./password.js";
import type { ClientType, JwtService, TokenClaims } from "./token.js";

const LOGIN_TYPES = ["password", "wechat-bind", "wechat"] as const;
const LOGIN_FIELDS = new Set(["loginType", "password", "username", "wechatCode"]);
const REFRESH_FIELDS = new Set(["refreshToken"]);

export type LoginType = (typeof LOGIN_TYPES)[number];

export type LoginRequest =
  | Readonly<{ loginType: "password"; password: string; username: string }>
  | Readonly<{
      loginType: "wechat-bind";
      password: string;
      username: string;
      wechatCode: string;
    }>
  | Readonly<{ loginType: "wechat"; wechatCode: string }>;

export type AuthRoleSummary = Readonly<{
  id: string;
  roleCode: RoleCode;
  roleName: string;
}>;

export type AuthPermissionSummary = Readonly<{
  actionCode: string;
  moduleCode: string;
  permissionCode: PermissionCode;
}>;

export type AuthScopeSummary = Readonly<{
  accessLevel: "manage" | "operate" | "read";
  targetId: string;
}>;

export type AuthUserRecord = Readonly<{
  displayName: string;
  failedLoginCount: number;
  id: string;
  isActive: boolean;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
  passwordHash: string;
  permissions: readonly AuthPermissionSummary[];
  roles: readonly AuthRoleSummary[];
  status: string;
  storeScopes: readonly AuthScopeSummary[];
  username: string;
  warehouseScopes: readonly AuthScopeSummary[];
  wechatBound: boolean;
}>;

export type PersistSessionInput = Readonly<{
  accessTokenExpiresAt: Date;
  clientType: ClientType;
  issuedAt: Date;
  refreshTokenExpiresAt: Date;
  refreshTokenHash: string;
  requestId: string;
  sessionId: string;
  tokenFamilyId: string;
  userId: string;
  username: string;
}>;

export type WechatIdentity = Readonly<{
  openid: string;
  unionid?: string;
}>;

export type RefreshResult =
  | Readonly<{ kind: "disabled" | "invalid" | "locked" | "replay" | "revoked" | "wechat-invalid" }>
  | Readonly<{ kind: "success"; session: AuthSessionState; user: AuthUserRecord }>;

export type AuthSessionState = Readonly<{
  accessTokenExpiresAt: Date;
  clientType: ClientType;
  refreshTokenExpiresAt: Date;
  sessionId: string;
  tokenFamilyId: string;
  userId: string;
}>;

export type AuthenticatedSessionRecord = Readonly<{
  session: AuthSessionState;
  user: AuthUserRecord;
}>;

export interface AuthRepository {
  bindWechatAndCreateSession(
    userId: string,
    identity: WechatIdentity,
    appId: string,
    session: PersistSessionInput,
  ): Promise<AuthUserRecord>;
  createSession(
    session: PersistSessionInput,
    action: "login.password" | "login.wechat",
    identity?: WechatIdentity,
  ): Promise<AuthUserRecord>;
  findUserByUsername(username: string): Promise<AuthUserRecord | null>;
  findUserByWechat(appId: string, openid: string): Promise<AuthUserRecord | null>;
  recordAuthenticationRejection(user: AuthUserRecord, requestId: string): Promise<void>;
  recordLoginFailure(user: AuthUserRecord, requestId: string): Promise<void>;
  resolveSession(
    claims: TokenClaims,
    clientType: ClientType,
  ): Promise<AuthenticatedSessionRecord | null>;
  revokeFamily(
    input: Readonly<{
      claims: TokenClaims;
      refreshTokenHash: string;
      requestId: string;
    }>,
  ): Promise<"invalid" | "success">;
  rotateSession(
    input: Readonly<{
      clientType: ClientType;
      newSession: PersistSessionInput;
      oldRefreshTokenHash: string;
      requestId: string;
    }>,
  ): Promise<RefreshResult>;
}

export interface WechatIdentityAdapter {
  exchange(code: string): Promise<WechatIdentity>;
}

type RateLimitWindow = Readonly<{
  count: number;
  expiresAt: number;
}>;

export class AuthenticationRateLimiter {
  readonly #clock: () => number;
  readonly #limit: number;
  readonly #windows = new Map<string, RateLimitWindow>();
  readonly #windowMilliseconds: number;

  constructor(limit = 10, windowMilliseconds = 60_000, clock: () => number = Date.now) {
    if (!Number.isInteger(limit) || limit < 1 || windowMilliseconds < 1) {
      throw new TypeError("认证限流配置无效");
    }
    this.#limit = limit;
    this.#windowMilliseconds = windowMilliseconds;
    this.#clock = clock;
  }

  consume(key: string): void {
    const now = this.#clock();
    const current = this.#windows.get(key);
    if (!current || current.expiresAt <= now) {
      this.#windows.set(key, { count: 1, expiresAt: now + this.#windowMilliseconds });
      this.#prune(now);
      return;
    }
    if (current.count >= this.#limit) throw securityError.rateLimitExceeded();
    this.#windows.set(key, { ...current, count: current.count + 1 });
  }

  #prune(now: number): void {
    if (this.#windows.size <= 1_000) return;
    for (const [key, value] of this.#windows) {
      if (value.expiresAt <= now) this.#windows.delete(key);
    }
    while (this.#windows.size > 1_000) {
      const oldest = this.#windows.keys().next().value as string | undefined;
      if (!oldest) break;
      this.#windows.delete(oldest);
    }
  }
}

type IdempotencyEntry<T> = Readonly<{
  expiresAt: number;
  fingerprint: string;
  result: Promise<T>;
}>;

export class AuthenticationIdempotencyStore {
  readonly #clock: () => number;
  readonly #entries = new Map<string, IdempotencyEntry<unknown>>();
  readonly #retentionMilliseconds: number;

  constructor(retentionMilliseconds = 10 * 60_000, clock: () => number = Date.now) {
    if (retentionMilliseconds < 1) throw new TypeError("认证幂等配置无效");
    this.#retentionMilliseconds = retentionMilliseconds;
    this.#clock = clock;
  }

  execute<T>(key: string, fingerprint: string, operation: () => Promise<T>): Promise<T> {
    const now = this.#clock();
    const existing = this.#entries.get(key);
    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppError("CONFLICT_IDEMPOTENCY_KEY_REUSED", 409, "幂等键已用于其他请求");
      }
      return existing.result as Promise<T>;
    }
    const result = operation();
    this.#entries.set(key, {
      expiresAt: now + this.#retentionMilliseconds,
      fingerprint,
      result,
    });
    this.#prune(now);
    return result;
  }

  #prune(now: number): void {
    for (const [key, value] of this.#entries) {
      if (value.expiresAt <= now) this.#entries.delete(key);
    }
    while (this.#entries.size > 1_000) {
      const oldest = this.#entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.#entries.delete(oldest);
    }
  }
}

export type AuthTokenResponse = Readonly<{
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  session: Readonly<{
    clientType: ClientType;
    displayName: string;
    mustChangePassword: boolean;
    roles: readonly AuthRoleSummary[];
    userId: string;
    username: string;
    wechatBound: boolean;
  }>;
  tokenType: "Bearer";
}>;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("请求体必须是 JSON 对象");
  }
  return value as Record<string, unknown>;
}

function strictFields(value: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ValidationError("请求包含未允许字段");
  }
}

function stringField(
  value: Record<string, unknown>,
  field: string,
  maximum: number,
  trim: boolean,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string") throw new ValidationError(`${field} 必须是字符串`);
  const normalized = trim ? candidate.trim() : candidate;
  if (!normalized || normalized.length > maximum) {
    throw new ValidationError(`${field} 长度不符合要求`);
  }
  return normalized;
}

export function parseLoginRequest(value: unknown): LoginRequest {
  const input = object(value);
  strictFields(input, LOGIN_FIELDS);
  if (typeof input.loginType !== "string" || !LOGIN_TYPES.includes(input.loginType as LoginType)) {
    throw new ValidationError("loginType 无效");
  }
  if (input.loginType === "password") {
    if (input.wechatCode !== undefined) throw new ValidationError("登录模式字段不能混用");
    return {
      loginType: "password",
      password: stringField(input, "password", 256, false),
      username: stringField(input, "username", 100, true),
    };
  }
  if (input.loginType === "wechat-bind") {
    return {
      loginType: "wechat-bind",
      password: stringField(input, "password", 256, false),
      username: stringField(input, "username", 100, true),
      wechatCode: stringField(input, "wechatCode", 256, true),
    };
  }
  if (input.username !== undefined || input.password !== undefined) {
    throw new ValidationError("登录模式字段不能混用");
  }
  return {
    loginType: "wechat",
    wechatCode: stringField(input, "wechatCode", 256, true),
  };
}

export function parseRefreshRequest(value: unknown): string {
  const input = object(value);
  strictFields(input, REFRESH_FIELDS);
  return stringField(input, "refreshToken", 512, false);
}

export function requireClientType(request: Request): ClientType {
  const value = request.headers.get("X-Client-Type");
  if (value !== "pc" && value !== "wechat-mini-program") {
    throw new ValidationError("X-Client-Type 无效");
  }
  return value;
}

export function assertLoginClient(loginType: LoginType, clientType: ClientType): void {
  const expected = loginType === "password" ? "pc" : "wechat-mini-program";
  if (clientType !== expected) throw new ValidationError("登录模式与客户端类型不匹配");
}

function ensureUserCanAuthenticate(user: AuthUserRecord, binding: boolean): void {
  if (!user.isActive || user.status !== "active") throw authenticationError.userDisabled();
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw authenticationError.userLocked();
  }
  if (user.roles.length === 0) throw authenticationError.credentialInvalid();
  if (binding && user.mustChangePassword) throw authenticationError.passwordChangeRequired();
}

function sessionInput(
  user: AuthUserRecord,
  clientType: ClientType,
  jwt: JwtService,
  requestId: string,
  familyId = randomUUID(),
): Readonly<{ persist: PersistSessionInput; refreshToken: string }> {
  const refresh = jwt.issueRefreshToken();
  const issuedAt = new Date();
  return {
    persist: {
      accessTokenExpiresAt: jwt.accessExpiresAt(),
      clientType,
      issuedAt,
      refreshTokenExpiresAt: jwt.refreshExpiresAt(),
      refreshTokenHash: refresh.hash,
      requestId,
      sessionId: randomUUID(),
      tokenFamilyId: familyId,
      userId: user.id,
      username: user.username,
    },
    refreshToken: refresh.token,
  };
}

export class AuthenticationService {
  readonly #appId: string;
  readonly #jwt: JwtService;
  readonly #repository: AuthRepository;
  readonly #wechat: WechatIdentityAdapter;

  constructor(
    repository: AuthRepository,
    jwt: JwtService,
    wechat: WechatIdentityAdapter,
    appId: string,
  ) {
    this.#repository = repository;
    this.#jwt = jwt;
    this.#wechat = wechat;
    this.#appId = appId;
  }

  async login(
    request: LoginRequest,
    clientType: ClientType,
    context: RequestContext,
  ): Promise<AuthTokenResponse> {
    assertLoginClient(request.loginType, clientType);
    if (request.loginType === "password") {
      const user = await this.#verifyCredentials(request.username, request.password, context);
      const issued = sessionInput(user, clientType, this.#jwt, context.requestId);
      const current = await this.#repository.createSession(issued.persist, "login.password");
      return this.#tokens(current, issued.persist, issued.refreshToken);
    }

    const identity = await this.#wechat.exchange(request.wechatCode);
    if (request.loginType === "wechat-bind") {
      const user = await this.#verifyCredentials(request.username, request.password, context, true);
      const issued = sessionInput(user, clientType, this.#jwt, context.requestId);
      const current = await this.#repository.bindWechatAndCreateSession(
        user.id,
        identity,
        this.#appId,
        issued.persist,
      );
      return this.#tokens(current, issued.persist, issued.refreshToken);
    }

    const user = await this.#repository.findUserByWechat(this.#appId, identity.openid);
    if (!user) throw authenticationError.wechatNotBound();
    await this.#ensureUser(user, true, context);
    const issued = sessionInput(user, clientType, this.#jwt, context.requestId);
    const current = await this.#repository.createSession(issued.persist, "login.wechat", identity);
    return this.#tokens(current, issued.persist, issued.refreshToken);
  }

  async refresh(
    refreshToken: string,
    clientType: ClientType,
    context: RequestContext,
  ): Promise<AuthTokenResponse> {
    const hash = this.#jwt.hashRefreshToken(refreshToken);
    const placeholder: AuthUserRecord = {
      displayName: "",
      failedLoginCount: 0,
      id: "00000000-0000-4000-8000-000000000000",
      isActive: true,
      lockedUntil: null,
      mustChangePassword: false,
      passwordHash: "",
      permissions: [],
      roles: [],
      status: "active",
      storeScopes: [],
      username: "",
      warehouseScopes: [],
      wechatBound: false,
    };
    const issued = sessionInput(placeholder, clientType, this.#jwt, context.requestId);
    const result = await this.#repository.rotateSession({
      clientType,
      newSession: issued.persist,
      oldRefreshTokenHash: hash,
      requestId: context.requestId,
    });
    if (result.kind !== "success") {
      switch (result.kind) {
        case "invalid":
          throw new InvalidRefreshTokenError();
        case "replay":
          throw authenticationError.refreshReplay();
        case "revoked":
          throw authenticationError.sessionRevoked();
        case "disabled":
          throw authenticationError.userDisabled();
        case "locked":
          throw authenticationError.userLocked();
        case "wechat-invalid":
          throw authenticationError.wechatNotBound();
      }
    }
    const session = { ...issued.persist, ...result.session };
    return this.#tokens(result.user, session, issued.refreshToken);
  }

  async logout(claims: TokenClaims, refreshToken: string, context: RequestContext): Promise<void> {
    const result = await this.#repository.revokeFamily({
      claims,
      refreshTokenHash: this.#jwt.hashRefreshToken(refreshToken),
      requestId: context.requestId,
    });
    if (result === "invalid") throw new InvalidRefreshTokenError();
  }

  async #verifyCredentials(
    username: string,
    password: string,
    context: RequestContext,
    binding = false,
  ): Promise<AuthUserRecord> {
    const user = await this.#repository.findUserByUsername(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      if (user) await this.#repository.recordLoginFailure(user, context.requestId);
      throw authenticationError.credentialInvalid();
    }
    await this.#ensureUser(user, binding, context);
    return user;
  }

  async #ensureUser(
    user: AuthUserRecord,
    binding: boolean,
    context: RequestContext,
  ): Promise<void> {
    try {
      ensureUserCanAuthenticate(user, binding);
    } catch (error) {
      await this.#repository.recordAuthenticationRejection(user, context.requestId);
      throw error;
    }
  }

  async #tokens(
    user: AuthUserRecord,
    session: PersistSessionInput,
    refreshToken: string,
  ): Promise<AuthTokenResponse> {
    const accessToken = await this.#jwt.signAccessToken({
      clientType: session.clientType,
      sessionId: session.sessionId,
      tokenFamilyId: session.tokenFamilyId,
      userId: user.id,
    });
    return {
      accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
      session: {
        clientType: session.clientType,
        displayName: user.displayName,
        mustChangePassword: user.mustChangePassword,
        roles: user.roles,
        userId: user.id,
        username: user.username,
        wechatBound: user.wechatBound,
      },
      tokenType: "Bearer",
    };
  }
}

export type WechatEnvironment = Readonly<{
  WECHAT_API_BASE_URL?: string;
  WECHAT_MINI_PROGRAM_APP_ID?: string;
  WECHAT_MINI_PROGRAM_APP_SECRET?: string;
}>;

export type WechatConfiguration = Readonly<{
  apiBaseUrl: string;
  appId: string;
  appSecret: string;
}>;

function requiredConfiguration(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, `${name} 未配置`);
  }
  return value.trim();
}

export function loadWechatConfiguration(environment: WechatEnvironment): WechatConfiguration {
  return {
    apiBaseUrl: requiredConfiguration(environment.WECHAT_API_BASE_URL, "WECHAT_API_BASE_URL"),
    appId: requiredConfiguration(
      environment.WECHAT_MINI_PROGRAM_APP_ID,
      "WECHAT_MINI_PROGRAM_APP_ID",
    ),
    appSecret: requiredConfiguration(
      environment.WECHAT_MINI_PROGRAM_APP_SECRET,
      "WECHAT_MINI_PROGRAM_APP_SECRET",
    ),
  };
}

export class HttpWechatIdentityAdapter implements WechatIdentityAdapter {
  readonly #configuration: WechatConfiguration;
  readonly #fetch: typeof fetch;

  constructor(configuration: WechatConfiguration, fetchImplementation: typeof fetch = fetch) {
    this.#configuration = configuration;
    this.#fetch = fetchImplementation;
  }

  async exchange(code: string): Promise<WechatIdentity> {
    const url = new URL("/sns/jscode2session", this.#configuration.apiBaseUrl);
    url.searchParams.set("appid", this.#configuration.appId);
    url.searchParams.set("secret", this.#configuration.appSecret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");
    try {
      const response = await this.#fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw authenticationError.wechatCodeInvalid();
      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload.openid !== "string" || !payload.openid.trim() || payload.errcode) {
        throw authenticationError.wechatCodeInvalid();
      }
      return {
        openid: payload.openid,
        ...(typeof payload.unionid === "string" && payload.unionid.trim()
          ? { unionid: payload.unionid }
          : {}),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, "微信认证服务暂不可用");
      }
      throw authenticationError.wechatCodeInvalid();
    }
  }
}
