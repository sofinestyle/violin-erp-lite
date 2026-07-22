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
