import { AttachmentCategoryUnsupportedError, AttachmentObjectUnsupportedError } from "./errors.js";
import {
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_OBJECT_TYPES,
  type AttachmentCategory,
  type AttachmentObjectType,
} from "./types.js";

type CategoryDefinition = Readonly<{
  allowedObjectTypes: ReadonlySet<AttachmentObjectType>;
  defaultRetention: string;
  defaultSensitive: boolean;
  evidence: boolean;
  neverUserDeletable: boolean;
}>;

const objectTypes = (...values: AttachmentObjectType[]) => new Set(values);
const allWritableObjectTypes = new Set(
  ATTACHMENT_OBJECT_TYPES.filter((value) => value !== "import_task"),
);

const CATEGORY_DEFINITIONS: Readonly<Record<AttachmentCategory, CategoryDefinition>> = {
  general_business_document: {
    allowedObjectTypes: allWritableObjectTypes,
    defaultRetention: "对象形成正式历史前且解除全部关联后可删除",
    defaultSensitive: false,
    evidence: false,
    neverUserDeletable: false,
  },
  inspection_evidence: {
    allowedObjectTypes: objectTypes("inspection_order"),
    defaultRetention: "验收提交或确认后永久保留",
    defaultSensitive: false,
    evidence: true,
    neverUserDeletable: false,
  },
  inbound_evidence: {
    allowedObjectTypes: objectTypes("inbound_order", "sales_return", "transfer_order"),
    defaultRetention: "入库提交或形成正式库存事实后永久保留",
    defaultSensitive: false,
    evidence: true,
    neverUserDeletable: false,
  },
  outbound_evidence: {
    allowedObjectTypes: objectTypes(
      "outbound_order",
      "purchase_return",
      "damage_report",
      "transfer_order",
      "cross_border_shipment",
    ),
    defaultRetention: "出库提交或形成正式库存事实后永久保留",
    defaultSensitive: false,
    evidence: true,
    neverUserDeletable: false,
  },
  inventory_evidence: {
    allowedObjectTypes: objectTypes(
      "inventory_adjustment",
      "stock_count",
      "sales_return",
      "damage_report",
    ),
    defaultRetention: "提交、执行、完成或形成库存事实后永久保留",
    defaultSensitive: false,
    evidence: true,
    neverUserDeletable: false,
  },
  import_source_file: {
    allowedObjectTypes: objectTypes("import_task"),
    defaultRetention: "Import Task 存在期间保留",
    defaultSensitive: true,
    evidence: true,
    neverUserDeletable: true,
  },
  import_error_report: {
    allowedObjectTypes: objectTypes("import_task"),
    defaultRetention: "随 Import Task 与审计链保留",
    defaultSensitive: true,
    evidence: true,
    neverUserDeletable: true,
  },
  payment_voucher: {
    allowedObjectTypes: objectTypes("purchase_payment", "production_payment"),
    defaultRetention: "付款事实创建后永久保留",
    defaultSensitive: true,
    evidence: true,
    neverUserDeletable: false,
  },
  production_progress_evidence: {
    allowedObjectTypes: objectTypes("production_progress_record", "production_completion_record"),
    defaultRetention: "生产进度或完工记录创建后永久保留",
    defaultSensitive: false,
    evidence: true,
    neverUserDeletable: false,
  },
  cross_border_shipping_evidence: {
    allowedObjectTypes: objectTypes("cross_border_shipment"),
    defaultRetention: "跨境发货提交或发运后永久保留",
    defaultSensitive: true,
    evidence: true,
    neverUserDeletable: false,
  },
};

const categorySet = new Set<string>(ATTACHMENT_CATEGORIES);
const objectTypeSet = new Set<string>(ATTACHMENT_OBJECT_TYPES);

export function isAttachmentCategory(value: string): value is AttachmentCategory {
  return categorySet.has(value);
}

export function isAttachmentObjectType(value: string): value is AttachmentObjectType {
  return objectTypeSet.has(value);
}

export class AttachmentCategoryRegistry {
  readonly size = ATTACHMENT_CATEGORIES.length;

  isSensitive(category: AttachmentCategory): boolean {
    return this.#definition(category).defaultSensitive;
  }

  isEvidence(category: AttachmentCategory): boolean {
    return this.#definition(category).evidence;
  }

  allowObjectType(category: AttachmentCategory, objectType: AttachmentObjectType): boolean {
    return this.#definition(category).allowedObjectTypes.has(objectType);
  }

  canDelete(
    category: AttachmentCategory,
    context: Readonly<{ hasLinks: boolean; protected: boolean }>,
  ): boolean {
    const definition = this.#definition(category);
    return !definition.neverUserDeletable && !context.hasLinks && !context.protected;
  }

  defaultSensitive(category: AttachmentCategory): boolean {
    return this.#definition(category).defaultSensitive;
  }

  defaultRetention(category: AttachmentCategory): string {
    return this.#definition(category).defaultRetention;
  }

  requireCategory(value: string): AttachmentCategory {
    if (!isAttachmentCategory(value)) throw new AttachmentCategoryUnsupportedError();
    return value;
  }

  requireObjectType(value: string): AttachmentObjectType {
    if (!isAttachmentObjectType(value)) throw new AttachmentObjectUnsupportedError();
    return value;
  }

  #definition(category: AttachmentCategory): CategoryDefinition {
    return CATEGORY_DEFINITIONS[category];
  }
}
