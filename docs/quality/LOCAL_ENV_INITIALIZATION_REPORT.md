---
document_name: 本地运行环境初始化报告
project: Violin ERP Lite
task: Local Node 22 + PostgreSQL Initialization
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# Violin ERP Lite 本地运行环境初始化报告

## 1. 初始化范围与隔离边界

本次只初始化 Violin ERP Lite 本地环境，不修改业务代码、Database Schema、Migration、
API Contract、Permission Spec 或 `ROADMAP.md`。

隔离结果：

- AI 电商视觉设计平台继续由独立 Node/Next.js 进程监听 `localhost:3000`；
- Violin ERP Lite 使用独立 Node 22 Shell 和 `localhost:3100`；
- 未执行任何 PM2 命令；
- 未停止、重启或修改 AI 项目；
- 未修改系统全局 Node；
- Violin `.env` 为 Git Ignored 本地文件，权限为 `0600`。

## 2. Node 与依赖

| 项目 | 结果 |
| --- | --- |
| Node.js | `v22.23.1` |
| Node 路径 | `/opt/homebrew/opt/node@22/bin/node` |
| pnpm | `11.12.0` |
| 项目 Engine | Node `>=22.0.0 <23`、pnpm `>=11.12.0 <12` |
| 安装命令 | `pnpm install` |
| 安装结果 | Workspace 依赖已是最新状态 |

Node 22 通过当前 Shell 的 `PATH` 启用：

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

系统 `/opt/homebrew/bin/node` 和 AI 项目运行时未被修改。

已确认 Workspace：

- `apps/admin`；
- `apps/miniapp`；
- `packages/api`；
- `packages/database`；
- `packages/shared`。

## 3. 环境变量

由 `.env.example` 创建本地 `.env`，文件未纳入 Git。以下变量已配置但本文档不记录具体
Secret 或 Password：

- `DATABASE_URL`；
- `POSTGRES_USER`；
- `POSTGRES_PASSWORD`；
- `POSTGRES_DB`；
- `POSTGRES_PORT`；
- `JWT_ACCESS_SECRET`；
- `JWT_REFRESH_PEPPER`；
- `JWT_ACCESS_EXPIRES_IN`；
- `JWT_REFRESH_EXPIRES_IN`；
- `IDEMPOTENCY_HMAC_SECRET`；
- `IDEMPOTENCY_LEASE_SECONDS`；
- `IDEMPOTENCY_RETENTION_SECONDS`；
- `IDEMPOTENCY_MAX_RESPONSE_BYTES`；
- `SEED_ADMIN_USERNAME`；
- `SEED_ADMIN_DISPLAY_NAME`；
- `SEED_ADMIN_PASSWORD`；
- `UPLOAD_STORAGE_PATH`；
- `UPLOAD_MAX_FILE_SIZE`；
- `NEXT_PUBLIC_APP_ENV`；
- `TARO_APP_ENV`；
- `TARO_APP_API_BASE_URL`；
- `WECHAT_API_BASE_URL`。

`TARO_APP_API_BASE_URL` 的本地值指向 `http://localhost:3100`。

真实 `WECHAT_MINI_PROGRAM_APP_ID` 和 `WECHAT_MINI_PROGRAM_APP_SECRET` 未提供并保持空值，
因此不执行真实微信登录测试。

## 4. PostgreSQL 状态

| 项目 | 结果 |
| --- | --- |
| PostgreSQL | Homebrew PostgreSQL `18.4` |
| 服务 | Running，`localhost:5432` Accepting Connections |
| Database | `violin_erp_lite` |
| Role | `violin_dev` |
| Schema | `public` |
| 连接验证 | Pass |

数据库和 Role 是本次新建的隔离本地开发对象。数据库密码随机生成并只保存在 `.env`，没有
输出或提交。

## 5. Migration 结果

使用仓库正式流程：

```bash
pnpm db:setup
pnpm db:validate
pnpm db:migrate:status
```

执行结果：

| 项目 | 结果 |
| --- | --- |
| Prisma Client Generate | Pass |
| Prisma Schema Validate | Pass |
| Migration 文件 | 8 |
| 已应用 Migration | 8 |
| 失败 Migration | 0 |
| Migration Status | Database schema is up to date |

已应用：

1. `20260722000000_initial`；
2. `20260723150000_add_user_wechat_identities`；
3. `20260723160000_add_auth_sessions`；
4. `20260724090000_add_import_status_value_checks`；
5. `20260725140000_add_persistent_idempotency_foundation`；
6. `20260725160000_add_attachment_status_constraints`；
7. `20260725170000_add_background_job_foundation`；
8. `20260725190000_add_event_infrastructure`。

未修改任何 Migration 文件或 Prisma Schema。

## 6. Seed 结果

Seed 执行成功：

| 属性 | 结果 |
| --- | --- |
| Username | `dev-admin` |
| Status | `active` |
| Role | `administrator` |
| Permission | 244 |
| First Login | `must_change_password = true` |
| Password | 仅保存在本地 `.env`，不在报告中记录 |

实际 API 验证：

- Password Login：HTTP 200；
- Access Token：已签发；
- Refresh Token：已签发；
- Session：Active；
- Session Username：`dev-admin`；
- Permission API：HTTP 200，返回 244 项权限；
- Role Count：1。

## 7. Admin/API 启动与访问

正确的本地启动命令：

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
set -a
source .env
set +a
pnpm --filter @violin-erp/admin dev -p 3100
```

验证结果：

| 检查项 | 地址 | 结果 |
| --- | --- | --- |
| Admin Web | `http://localhost:3100` | HTTP 200 |
| API Health | `http://localhost:3100/api/health` | HTTP 200 |
| API Base | `http://localhost:3100/api/v1` | Running |
| Password Login | `/api/v1/auth/login` | HTTP 200 |
| Session | `/api/v1/auth/session` | HTTP 200 |
| Permission | `/api/v1/auth/permissions` | HTTP 200 |

Health 内容：

- Application：`ok`；
- Database：`connected`。

不要使用 `pnpm dev:admin -- -p 3100`。该写法会把 `-p` 识别为 Next.js 项目目录。必须使用
上面的 package script 参数形式。

## 8. Mini Program

使用 Node 22 和本地环境变量执行：

```bash
pnpm build:miniapp
```

结果：

- Taro `4.2.1`；
- Webpack 编译成功；
- `apps/miniapp/dist/app.js` 已生成；
- `TARO_APP_API_BASE_URL` 指向 `http://localhost:3100`；
- `miniprogramRoot` 为 `dist/`；
- 当前 `project.config.json` 使用 `touristappid`。

微信开发者工具已经具备导入 `apps/miniapp` 并进行基础预览的条件。真实微信登录仍需要项目
批准的 AppID、App Secret、微信身份绑定和可访问的 request 合法域名。

## 9. AI 项目保护验证

初始化和启动期间持续检查：

| 端口 | 项目 | 结果 |
| --- | --- | --- |
| 3000 | AI 电商视觉设计平台，Next.js `16.2.9` | 持续监听，未操作 |
| 3100 | Violin ERP Lite，Next.js `16.2.11` | 独立启动验证成功 |

没有使用 PM2，没有修改 AI 项目配置，没有发生端口竞争。

## 10. 已知问题

1. 首次登录后必须按正式流程修改 Seed 密码；
2. 真实微信 AppID/App Secret 未配置，只能进行小程序构建和基础预览；
3. 登录验证期间底层 `pg` 输出一次 `client.query()` 并发调用弃用警告，但请求成功、数据和
   Session 正常；该警告不阻塞本地启动，后续升级数据库驱动时应复核；
4. Node 22 目前通过命令级 `PATH` 隔离启用，新终端启动 Violin 前需再次设置；
5. `.env` 和本地开发数据库不得提交、共享或用于生产。

## 11. 初始化结论

Violin ERP Lite 本机完整运行环境初始化完成：

- Node 22：Pass；
- PostgreSQL 18：Pass；
- Database/Role：Pass；
- Migration：Pass；
- Seed：Pass；
- Admin Login：Pass；
- API Health：Pass；
- Web 3100：Pass；
- Mini Program Build：Pass；
- AI 平台隔离：Pass。

最终工程验证：

- `pnpm status:check`：Pass；
- Format：Pass；
- ESLint：Pass；
- TypeScript：Pass；
- Test：294 Passed / 30 External Integration Skipped；
- Admin Production Build：Pass；
- Mini Program Production Build：Pass；
- `git diff --check`：Pass。
