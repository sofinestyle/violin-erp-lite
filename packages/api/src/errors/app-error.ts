import type { ErrorDetail } from "../response/api-response.js";

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export class AppError extends Error {
  readonly code: string;
  readonly details: readonly ErrorDetail[];
  readonly expose: boolean;
  readonly httpStatus: number;

  constructor(
    code: string,
    httpStatus: number,
    message: string,
    details: readonly ErrorDetail[] = [],
    expose = true,
  ) {
    if (!ERROR_CODE_PATTERN.test(code)) {
      throw new TypeError("错误码必须使用大写英文、数字和下划线");
    }

    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
    this.expose = expose;
    this.httpStatus = httpStatus;
  }
}

export class ValidationError extends AppError {
  constructor(message = "请求数据校验失败", details: readonly ErrorDetail[] = []) {
    super("VALIDATION_INVALID_FIELD", 422, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "请求的资源不存在或不可访问") {
    super("RESOURCE_NOT_FOUND", 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "请求与当前数据状态冲突") {
    super("CONFLICT_REQUEST", 409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "身份认证无效或已失效") {
    super("AUTH_UNAUTHORIZED", 401, message);
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super("AUTH_TOKEN_EXPIRED", 401, "访问凭证已过期");
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super("AUTH_REFRESH_TOKEN_INVALID", 401, "刷新凭证无效或已失效");
  }
}

export class AuthenticationError extends AppError {
  constructor(code: string, httpStatus: number, message: string) {
    super(code, httpStatus, message);
  }
}

export const authenticationError = {
  bindingConflict: () =>
    new AuthenticationError("AUTH_BINDING_CONFLICT", 409, "微信身份绑定发生冲突"),
  credentialInvalid: () =>
    new AuthenticationError("AUTH_CREDENTIAL_INVALID", 401, "用户名或密码无效"),
  passwordChangeRequired: () =>
    new AuthenticationError("AUTH_PASSWORD_CHANGE_REQUIRED", 403, "账号必须先完成密码修改"),
  refreshReplay: () =>
    new AuthenticationError("AUTH_REFRESH_TOKEN_REPLAY", 401, "刷新凭证已重放，会话族已撤销"),
  sessionRevoked: () => new AuthenticationError("AUTH_SESSION_REVOKED", 401, "当前会话已撤销"),
  userDisabled: () => new AuthenticationError("AUTH_USER_DISABLED", 403, "用户已停用"),
  userLocked: () => new AuthenticationError("AUTH_USER_LOCKED", 429, "用户暂时锁定"),
  wechatAccountBound: () =>
    new AuthenticationError("AUTH_ACCOUNT_ALREADY_BOUND", 409, "系统账号已有微信绑定"),
  wechatAlreadyBound: () =>
    new AuthenticationError("AUTH_WECHAT_ALREADY_BOUND", 409, "微信身份已有绑定"),
  wechatCodeInvalid: () =>
    new AuthenticationError("AUTH_WECHAT_CODE_INVALID", 401, "微信授权凭证无效"),
  wechatNotBound: () =>
    new AuthenticationError("AUTH_WECHAT_NOT_BOUND", 401, "微信身份尚未绑定系统账号"),
} as const;

export const securityError = {
  rateLimitExceeded: () =>
    new AuthenticationError("SECURITY_RATE_LIMIT_EXCEEDED", 429, "访问频率超出限制"),
} as const;

export class ForbiddenError extends AppError {
  constructor(message = "无权执行此操作") {
    super("PERMISSION_FORBIDDEN", 403, message);
  }
}

export class InternalServerError extends AppError {
  constructor() {
    super("SYSTEM_INTERNAL_ERROR", 500, "系统异常，请稍后重试", [], false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "服务暂不可用，请稍后重试") {
    super("SYSTEM_SERVICE_UNAVAILABLE", 503, message);
  }
}

export class AuditUnavailableError extends AppError {
  constructor() {
    super("SYSTEM_AUDIT_UNAVAILABLE", 503, "审计记录暂时不可用");
  }
}

export function normalizeError(error: unknown): AppError {
  return error instanceof AppError ? error : new InternalServerError();
}
