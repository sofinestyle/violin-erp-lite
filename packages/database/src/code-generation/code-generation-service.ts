import { ValidationError, type MasterDataResourceKey } from "@violin-erp/api";

type QueryClient = Readonly<{
  $executeRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown>;
  $queryRawUnsafe?: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  products?: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  };
}>;

type SequentialCodeType = "manufacturer" | "product" | "supplier" | "warehouse";

type CodeRuleRow = Readonly<{
  code_type: string;
  format: string;
  prefix: string;
}>;

type CodeSequenceRow = Readonly<{
  current_value: bigint | number | string;
  id: string;
  version: number;
}>;

const RESOURCE_CODE_TYPE: Readonly<Partial<Record<MasterDataResourceKey, SequentialCodeType>>> = {
  manufacturers: "manufacturer",
  products: "product",
  suppliers: "supplier",
  warehouses: "warehouse",
};

const RESOURCE_CODE_FIELD: Readonly<Partial<Record<MasterDataResourceKey, string>>> = {
  manufacturers: "manufacturerCode",
  products: "productCode",
  skus: "skuCode",
  suppliers: "supplierCode",
  warehouses: "warehouseCode",
};

const SIZE_CODES: Readonly<Record<string, string>> = {
  "1/10": "110",
  "1/16": "116",
  "1/8": "18",
  "1/2": "12",
  "1/4": "14",
  "3/4": "34",
  "4/4": "44",
  "110": "110",
  "116": "116",
  "12": "12",
  "14": "14",
  "18": "18",
  "34": "34",
  "36寸": "36",
  "38寸": "38",
  "39寸": "39",
  "40寸": "40",
  "41寸": "41",
  "44": "44",
  无尺寸: "NS",
};

const COLOR_CODES: Readonly<Record<string, string>> = {
  black: "BK",
  bk: "BK",
  blue: "BL",
  bl: "BL",
  br: "BR",
  brown: "BR",
  gn: "GN",
  green: "GN",
  nat: "NAT",
  natural: "NAT",
  rd: "RD",
  red: "RD",
  wh: "WH",
  white: "WH",
  yg: "YG",
  yellowgreen: "YG",
  "yellow-green": "YG",
  原木: "NAT",
  原木色: "NAT",
  白: "WH",
  白色: "WH",
  棕: "BR",
  棕色: "BR",
  红: "RD",
  红色: "RD",
  黄绿色: "YG",
  绿: "GN",
  绿色: "GN",
  蓝: "BL",
  蓝色: "BL",
  黑: "BK",
  黑色: "BK",
};

function hasUsableCode(data: Readonly<Record<string, unknown>>, field: string): boolean {
  const value = data[field];
  return typeof value === "string" && value.trim().length > 0;
}

function requireQueryClient(
  client: QueryClient,
): Required<Pick<QueryClient, "$executeRawUnsafe" | "$queryRawUnsafe">> {
  if (!client.$queryRawUnsafe || !client.$executeRawUnsafe) {
    throw new Error("CodeGenerationService requires Prisma raw query support");
  }
  return {
    $executeRawUnsafe: client.$executeRawUnsafe.bind(client),
    $queryRawUnsafe: client.$queryRawUnsafe.bind(client),
  };
}

function toInteger(value: bigint | number | string): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number.parseInt(value, 10);
}

function formatSequentialCode(rule: CodeRuleRow, nextValue: number): string {
  if (!Number.isSafeInteger(nextValue) || nextValue < 1) {
    throw new ValidationError("编码流水值无效");
  }
  const sequence = String(nextValue).padStart(6, "0");
  if (rule.format === "{prefix}-{seq:000000}") return `${rule.prefix}-${sequence}`;
  return `${rule.prefix}-${sequence}`;
}

function normalizeSize(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("SKU 尺寸缺失，无法生成 SKU 编码", [
      { field: "size", message: "尺寸必须填写，例如 4/4、3/4、1/8、36寸、无尺寸" },
    ]);
  }
  const normalized = value.trim().replace(/\s+/g, "");
  const code = SIZE_CODES[normalized];
  if (!code) {
    throw new ValidationError("SKU 尺寸不在自动编码映射范围内", [
      { field: "size", message: "尺寸仅支持已批准的提琴、吉他、尤克里里和配件尺寸映射" },
    ]);
  }
  return code;
}

function normalizeColor(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("SKU 颜色缺失，无法生成 SKU 编码", [
      { field: "color", message: "颜色必须填写，例如 黑色、棕色、原木色、绿色、蓝色" },
    ]);
  }
  const normalized = value.trim().toLowerCase();
  const code = COLOR_CODES[normalized] ?? COLOR_CODES[value.trim()];
  if (!code) {
    throw new ValidationError("SKU 颜色不在自动编码映射范围内", [
      { field: "color", message: "颜色仅支持 原木色、棕色、黑色、白色、红色、蓝色、绿色、黄绿色" },
    ]);
  }
  return code;
}

function extractModelCode(product: Record<string, unknown> | null): string {
  const candidates = [
    product?.product_model_code,
    product?.model_code,
    product?.product_name_en,
    product?.product_code,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().toUpperCase();
    if (/^[A-Z][A-Z0-9]{0,19}$/.test(normalized)) return normalized;
  }
  throw new ValidationError("产品缺少可用于 SKU 自动编码的型号", [
    {
      field: "productId",
      message: "请在产品英文名称中维护稳定型号（例如 L2），或提交已批准的历史 SKU 编码。",
    },
  ]);
}

export class CodeGenerationService {
  async applyMasterDataCode(
    client: QueryClient,
    resource: MasterDataResourceKey,
    data: Readonly<Record<string, unknown>>,
  ): Promise<Readonly<Record<string, unknown>>> {
    const codeField = RESOURCE_CODE_FIELD[resource];
    if (!codeField || hasUsableCode(data, codeField)) return data;

    if (resource === "skus") {
      return { ...data, skuCode: await this.#generateSkuCode(client, data) };
    }

    const codeType = RESOURCE_CODE_TYPE[resource];
    if (!codeType) return data;
    return { ...data, [codeField]: await this.#generateSequentialCode(client, codeType) };
  }

  async #generateSequentialCode(
    client: QueryClient,
    codeType: SequentialCodeType,
  ): Promise<string> {
    const raw = requireQueryClient(client);
    const rules = await raw.$queryRawUnsafe<CodeRuleRow[]>(
      "SELECT code_type, prefix, format FROM code_generation_rules WHERE lower(code_type) = lower($1) AND enabled = true LIMIT 1",
      codeType,
    );
    const rule = rules[0];
    if (!rule) {
      throw new ValidationError("编码规则未启用或不存在", [
        { field: "codeType", message: `${codeType} 编码规则不可用` },
      ]);
    }

    const sequences = await raw.$queryRawUnsafe<CodeSequenceRow[]>(
      "SELECT id, current_value, version FROM code_sequences WHERE lower(code_type) = lower($1) FOR UPDATE",
      codeType,
    );
    const sequence = sequences[0];
    if (!sequence) {
      throw new ValidationError("编码流水未初始化", [
        { field: "codeType", message: `${codeType} 编码流水不可用` },
      ]);
    }

    const nextValue = toInteger(sequence.current_value) + 1;
    await raw.$executeRawUnsafe(
      "UPDATE code_sequences SET current_value = $1, version = version + 1, updated_at = now() WHERE id = $2",
      nextValue,
      sequence.id,
    );
    return formatSequentialCode(rule, nextValue);
  }

  async #generateSkuCode(
    client: QueryClient,
    data: Readonly<Record<string, unknown>>,
  ): Promise<string> {
    const productId = data.productId;
    if (typeof productId !== "string" || !productId) {
      throw new ValidationError("SKU 所属产品缺失，无法生成 SKU 编码", [
        { field: "productId", message: "请选择有效产品" },
      ]);
    }
    if (!client.products) {
      throw new Error("CodeGenerationService requires product lookup support for SKU codes");
    }
    const product = await client.products.findFirst({
      select: {
        product_code: true,
        product_name_en: true,
      },
      where: { id: productId, is_active: true },
    });
    if (!product) {
      throw new ValidationError("SKU 所属产品不存在或已停用", [
        { field: "productId", message: "请选择有效产品" },
      ]);
    }
    const modelCode = extractModelCode(product);
    const sizeCode = normalizeSize(data.size);
    const colorCode = normalizeColor(data.color);
    return `${modelCode}-${sizeCode}-${colorCode}`;
  }
}

export function isAutomaticCodeResource(resource: MasterDataResourceKey): boolean {
  return Boolean(RESOURCE_CODE_FIELD[resource]);
}
