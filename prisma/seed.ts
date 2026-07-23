import {
  PERMISSION_CODES,
  hashPassword,
  verifyPassword,
  type PermissionCode,
} from "../packages/api/src/index.ts";
import { createPrismaClient } from "../packages/database/src/client.ts";

const ADMINISTRATOR_ROLE_CODE = "administrator";
const ADMINISTRATOR_ROLE_NAME = "管理员";

const RESOURCE_LABELS: Readonly<Record<string, string>> = {
  "attachment.file": "附件",
  "audit.log": "审计日志",
  "cross-border.import-result": "海外导入结果",
  "cross-border.overseas-inventory": "海外仓库存",
  "cross-border.shipment": "跨境发货",
  "cross-border.source-trace": "海外库存来源追溯",
  "field.amount": "金额字段",
  "field.attachment-sensitive": "敏感附件",
  "field.audit-sensitive": "审计敏感字段",
  "field.cost": "成本字段",
  "field.import-raw-data": "导入原始数据",
  "field.manufacturer-sensitive": "厂家敏感信息",
  "field.personal-data": "客户个人信息",
  "field.supplier-sensitive": "供应商敏感信息",
  "import.history": "导入历史",
  "import.task": "导入任务",
  "import.template": "导入模板",
  "inbound.order": "入库单",
  "inspection.order": "质量验收",
  "inventory.adjustment": "库存调整",
  "inventory.alert": "库存预警",
  "inventory.damage": "报损",
  "inventory.stock": "当前库存",
  "inventory.stock-count": "库存盘点",
  "inventory.transaction": "库存流水",
  "master.brand": "品牌",
  "master.category": "产品分类",
  "master.customer-snapshot": "客户快照",
  "master.manufacturer": "生产厂家",
  "master.platform": "电商平台",
  "master.product": "产品",
  "master.sku": "SKU",
  "master.store": "店铺",
  "master.supplier": "供应商",
  "master.warehouse": "仓库",
  "outbound.order": "出库单",
  "outbound.sales-return": "销售退货",
  "production.completion": "分批完工",
  "production.order": "生产订单",
  "production.payment": "生产付款",
  "production.progress": "生产进度",
  "purchase.order": "采购订单",
  "purchase.payment": "采购付款",
  "purchase.return": "采购退货",
  "security.permission": "权限分配",
  "security.role": "角色管理",
  "security.setting": "系统设置",
  "security.user": "用户管理",
  "transfer.order": "调拨单",
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  approve: "审核通过",
  assign: "分配",
  cancel: "取消",
  close: "关闭",
  complete: "完成",
  confirm: "确认",
  "confirm-inbound": "确认入库",
  "confirm-outbound": "确认出库",
  create: "新增",
  "create-domestic-sales": "创建国内销售出库",
  "create-other": "创建其他",
  "create-production": "创建生产来源",
  "create-purchase": "创建采购来源",
  delete: "删除",
  disable: "停用",
  dispatch: "发运确认",
  download: "下载",
  enable: "启用",
  execute: "执行",
  export: "导出",
  handle: "登记处理",
  "initial-count": "录入初盘",
  link: "关联",
  read: "查看",
  receive: "调入确认",
  recount: "录入复盘",
  reject: "审核驳回",
  reverse: "冲销",
  revoke: "撤销",
  ship: "调出确认",
  start: "开始",
  submit: "提交",
  unapprove: "反审核",
  unlink: "解除关联",
  update: "修改",
  upload: "上传",
  validate: "校验",
  view: "标记已查看",
  void: "作废",
  withdraw: "撤回",
};

type SeedConfiguration = Readonly<{
  adminDisplayName: string;
  adminEmail: string | null;
  adminPassword: string;
  adminUsername: string;
  databaseUrl: string;
}>;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the development seed`);
  }
  return value;
}

function boundedEnvironment(name: string, maximumLength: number): string {
  const value = requiredEnvironment(name);
  if (value.length > maximumLength) {
    throw new Error(`${name} must not exceed ${maximumLength} characters`);
  }
  return value;
}

function loadSeedConfiguration(): SeedConfiguration {
  const adminPassword = requiredEnvironment("SEED_ADMIN_PASSWORD");
  if (
    adminPassword.length < 12 ||
    /^(change|replace|password|your)[-_ ]/i.test(adminPassword)
  ) {
    throw new Error("SEED_ADMIN_PASSWORD must be a non-placeholder value of at least 12 characters");
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || null;
  if (adminEmail && (adminEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))) {
    throw new Error("SEED_ADMIN_EMAIL must be a valid email address");
  }

  return {
    adminDisplayName: boundedEnvironment("SEED_ADMIN_DISPLAY_NAME", 200),
    adminEmail,
    adminPassword,
    adminUsername: boundedEnvironment("SEED_ADMIN_USERNAME", 100),
    databaseUrl: requiredEnvironment("DATABASE_URL"),
  };
}

function permissionMetadata(permissionCode: PermissionCode): Readonly<{
  actionCode: string;
  moduleCode: string;
  permissionName: string;
}> {
  const separator = permissionCode.lastIndexOf(".");
  const resource = permissionCode.slice(0, separator);
  const actionCode = permissionCode.slice(separator + 1);
  const resourceLabel = RESOURCE_LABELS[resource];
  const actionLabel = ACTION_LABELS[actionCode];

  if (!resourceLabel || !actionLabel) {
    throw new Error(`Missing Frozen permission label for ${permissionCode}`);
  }

  return {
    actionCode,
    moduleCode: resource,
    permissionName: `${resourceLabel}·${actionLabel}`,
  };
}

async function main(): Promise<void> {
  const configuration = loadSeedConfiguration();
  const database = createPrismaClient(configuration.databaseUrl);

  try {
    const result = await database.$transaction(
      async (transaction) => {
        const existingUser = await transaction.users.findFirst({
          where: {
            username: { equals: configuration.adminUsername, mode: "insensitive" },
          },
        });
        const passwordMatches = existingUser
          ? await verifyPassword(configuration.adminPassword, existingUser.password_hash)
          : false;

        const administrator = existingUser
          ? await transaction.users.update({
              data: {
                display_name: configuration.adminDisplayName,
                ...(configuration.adminEmail ? { email: configuration.adminEmail } : {}),
                is_active: true,
                disabled_at: null,
                disabled_by: null,
                locked_until: null,
                failed_login_count: 0,
                must_change_password: true,
                ...(!passwordMatches
                  ? { password_hash: await hashPassword(configuration.adminPassword) }
                  : {}),
                status: "active",
                updated_by: existingUser.id,
              },
              where: { id: existingUser.id },
            })
          : await (async () => {
              const [{ id }] = await transaction.$queryRaw<readonly [{ id: string }]>`
                SELECT uuidv7()::text AS id
              `;
              return transaction.users.create({
                data: {
                  id,
                  created_by: id,
                  display_name: configuration.adminDisplayName,
                  email: configuration.adminEmail,
                  failed_login_count: 0,
                  is_active: true,
                  must_change_password: true,
                  password_hash: await hashPassword(configuration.adminPassword),
                  status: "active",
                  updated_by: id,
                  username: configuration.adminUsername,
                },
              });
            })();

        const existingRole = await transaction.roles.findFirst({
          where: {
            role_code: { equals: ADMINISTRATOR_ROLE_CODE, mode: "insensitive" },
          },
        });
        const role = existingRole
          ? await transaction.roles.update({
              data: {
                description: "Frozen ROLE_PERMISSION_SPEC 管理员角色",
                disabled_at: null,
                disabled_by: null,
                is_active: true,
                is_system_role: true,
                role_name: ADMINISTRATOR_ROLE_NAME,
                updated_by: administrator.id,
              },
              where: { id: existingRole.id },
            })
          : await transaction.roles.create({
              data: {
                created_by: administrator.id,
                description: "Frozen ROLE_PERMISSION_SPEC 管理员角色",
                is_active: true,
                is_system_role: true,
                role_code: ADMINISTRATOR_ROLE_CODE,
                role_name: ADMINISTRATOR_ROLE_NAME,
                updated_by: administrator.id,
              },
            });

        const existingPermissions = new Map(
          (
            await transaction.permissions.findMany({
              select: { id: true, permission_code: true },
            })
          ).map((permission) => [permission.permission_code.toLowerCase(), permission]),
        );
        const permissionIds: string[] = [];

        for (const permissionCode of PERMISSION_CODES) {
          const metadata = permissionMetadata(permissionCode);
          const existingPermission = existingPermissions.get(permissionCode.toLowerCase());
          const permission = existingPermission
            ? await transaction.permissions.update({
                data: {
                  action_code: metadata.actionCode,
                  description: "Frozen ROLE_PERMISSION_SPEC 正式权限",
                  disabled_at: null,
                  disabled_by: null,
                  is_active: true,
                  module_code: metadata.moduleCode,
                  permission_name: metadata.permissionName,
                  updated_by: administrator.id,
                },
                where: { id: existingPermission.id },
              })
            : await transaction.permissions.create({
                data: {
                  action_code: metadata.actionCode,
                  created_by: administrator.id,
                  description: "Frozen ROLE_PERMISSION_SPEC 正式权限",
                  is_active: true,
                  module_code: metadata.moduleCode,
                  permission_code: permissionCode,
                  permission_name: metadata.permissionName,
                  updated_by: administrator.id,
                },
              });
          permissionIds.push(permission.id);
        }

        const now = new Date();
        await transaction.user_roles.upsert({
          create: {
            assigned_at: now,
            assigned_by: administrator.id,
            created_by: administrator.id,
            effective_from: now,
            role_id: role.id,
            updated_by: administrator.id,
            user_id: administrator.id,
          },
          update: {
            assigned_at: now,
            assigned_by: administrator.id,
            effective_from: now,
            effective_to: null,
            updated_by: administrator.id,
          },
          where: {
            user_id_role_id: {
              role_id: role.id,
              user_id: administrator.id,
            },
          },
        });

        const assignedPermissionIds = new Set(
          (
            await transaction.role_permissions.findMany({
              select: { permission_id: true },
              where: { role_id: role.id },
            })
          ).map((assignment) => assignment.permission_id),
        );

        await transaction.role_permissions.createMany({
          data: permissionIds
            .filter((permissionId) => !assignedPermissionIds.has(permissionId))
            .map((permissionId) => ({
              created_by: administrator.id,
              granted_at: now,
              granted_by: administrator.id,
              permission_id: permissionId,
              role_id: role.id,
              updated_by: administrator.id,
            })),
          skipDuplicates: true,
        });

        return {
          administratorUsername: administrator.username,
          permissionCount: permissionIds.length,
          roleCode: role.role_code,
        };
      },
      { timeout: 30_000 },
    );

    console.info(
      `Development seed ready: user=${result.administratorUsername}, role=${result.roleCode}, permissions=${result.permissionCount}`,
    );
  } finally {
    await database.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Development seed failed");
  process.exitCode = 1;
});
