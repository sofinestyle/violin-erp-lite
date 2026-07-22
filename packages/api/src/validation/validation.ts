import { ValidationError } from "../errors/app-error.js";
import type { ErrorDetail } from "../response/api-response.js";

export type ValidationResult<T> =
  | Readonly<{ data: T; success: true }>
  | Readonly<{ issues: readonly ErrorDetail[]; success: false }>;

export type Validator<T> = (input: unknown) => ValidationResult<T>;

export function validateInput<T>(input: unknown, validator: Validator<T>): T {
  const result = validator(input);

  if (!result.success) {
    throw new ValidationError("请求数据校验失败", result.issues);
  }

  return result.data;
}

export async function parseJsonBody<T>(request: Request, validator: Validator<T>): Promise<T> {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    throw new ValidationError("请求体必须是有效的 JSON", [
      { code: "INVALID_JSON", message: "请求体必须是有效的 JSON" },
    ]);
  }

  return validateInput(input, validator);
}
