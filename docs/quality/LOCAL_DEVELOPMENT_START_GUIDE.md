---
document_name: 本地开发环境启动与人工验收指南
project: Violin ERP Lite
task: Local Environment Verification & Startup Guide
status: Completed / Pending Approval
owner: Project Manager
created_date: 2026-07-26
updated_date: 2026-07-26
related_phase: Phase 10
---

# 本地开发环境启动与人工验收指南

## 1. 本地环境要求

### 1.1 版本基线

| 组件 | 项目要求 | 本机检查结果 | 状态 |
| --- | --- | --- | --- |
| Node.js | `>=22.0.0 <23`，`.nvmrc` 为 `22` | `v26.3.1` | 不符合，启动前必须切换 |
| pnpm | `>=11.12.0 <12` | `11.12.0` | 符合 |
| PostgreSQL | `18.x`，Migration 使用 `uuidv7()` | Homebrew PostgreSQL `18.4` 已运行 | 引擎符合 |
| Docker Compose | 推荐但非强制 | 本机未安装 Docker | 使用本机 PostgreSQL 路径 |
| 微信开发者工具 | 当前稳定版本 | 需人工安装 | 小程序人工验收必需 |

Node.js 必须先切换为仓库声明的 22.x。当前 Node 26 虽能完成构建和启动验证，但会持续产生
`Unsupported engine`，不属于受支持的本地或生产运行环境。

```bash
nvm install 22
nvm use
corepack enable
node --version
pnpm --version
```

### 1.2 项目结构

| 路径 | 作用 |
| --- | --- |
| `apps/admin` | Next.js PC 管理端，同时承载 `/api/health` 和 `/api/v1/*` API |
| `apps/miniapp` | Taro 微信小程序，编译输出为 `apps/miniapp/dist` |
| `packages/api` | API Contract、Service、权限、校验、审计和平台能力 |
| `packages/database` | Prisma Repository、事务、Job/Event Runtime |
| `packages/shared` | 双端共享类型和基础代码 |

项目当前没有独立 `dev:api` 进程。执行 `pnpm dev:admin` 会同时启动 Admin Web 和 API
Route Handler。

### 1.3 PostgreSQL 与 Migration

仓库要求 PostgreSQL 18.x，共有 8 个 Forward-only Migration：

1. Initial；
2. WeChat Identity；
3. Authentication Session；
4. Import Status Check；
5. Persistent Idempotency；
6. Attachment Status Constraint；
7. Background Job Foundation；
8. Event Infrastructure。

本机 PostgreSQL 18.4 服务和 `localhost:5432` 已就绪，但当前不存在
`violin_dev` Role、`violin_erp_lite` Database 和 `_prisma_migrations`，因此本地应用
数据库状态为 **Not Initialized**。本次检查没有创建数据库或执行 Migration。

### 1.4 环境变量

仓库只有 `.env.example`，当前没有 `.env`。`.env` 已被 Git 忽略，禁止提交其中内容。

完整本地启动必须配置：

| 类别 | 配置项 | 说明 |
| --- | --- | --- |
| Client | `NEXT_PUBLIC_APP_ENV` | Admin 环境标识 |
| Client | `TARO_APP_ENV` | 小程序环境标识 |
| Client | `TARO_APP_API_BASE_URL` | 小程序可访问的 Admin/API Origin |
| Compose | `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`、`POSTGRES_PORT` | 仅 Docker Compose 或同名本机配置使用 |
| Database | `DATABASE_URL` | Prisma 与 API 数据库连接 |
| Authentication | `JWT_ACCESS_SECRET` | 服务端 Access Token Secret，至少 32 字符 |
| Authentication | `JWT_REFRESH_PEPPER` | 与 Access Secret 不同，至少 32 字符 |
| Authentication | `JWT_ACCESS_EXPIRES_IN`、`JWT_REFRESH_EXPIRES_IN` | Token 有效期 |
| Idempotency | `IDEMPOTENCY_HMAC_SECRET` | 持久化幂等 HMAC Secret，至少 32 字符 |
| Idempotency | `IDEMPOTENCY_LEASE_SECONDS`、`IDEMPOTENCY_RETENTION_SECONDS` | Lease 与保留时间 |
| Idempotency | `IDEMPOTENCY_MAX_RESPONSE_BYTES` | 幂等响应保存上限 |
| WeChat | `WECHAT_MINI_PROGRAM_APP_ID` | 真实微信登录需要 |
| WeChat | `WECHAT_MINI_PROGRAM_APP_SECRET` | 仅服务端保存 |
| WeChat | `WECHAT_API_BASE_URL` | 默认 `https://api.weixin.qq.com` |
| Seed | `SEED_ADMIN_USERNAME`、`SEED_ADMIN_DISPLAY_NAME` | 开发管理员标识 |
| Seed | `SEED_ADMIN_PASSWORD` | 必填，至少 12 字符，不得使用占位值 |
| Seed | `SEED_ADMIN_EMAIL` | 可选 |
| Upload | `UPLOAD_STORAGE_PATH`、`UPLOAD_MAX_FILE_SIZE` | 本地附件目录和上传限制 |

建议生成互不相同的本地 Secret：

```bash
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
```

分别填写 JWT Access Secret、Refresh Pepper 与 Idempotency HMAC Secret。不得将生成值复制
到文档、Issue、聊天记录或 Git。

## 2. 安装步骤

### 2.1 安装依赖

在仓库根目录执行：

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

编辑未跟踪的 `.env`，替换所有空 Secret、微信配置和 `SEED_ADMIN_PASSWORD`。

### 2.2 初始化数据库

#### 方式 A：Docker Compose

适用于已经安装 Docker Desktop 的环境：

```bash
pnpm db:up
pnpm db:setup
pnpm db:migrate:status
```

#### 方式 B：本机 PostgreSQL 18

当前被检查的电脑应使用此方式。先以本机 PostgreSQL 管理用户创建隔离开发 Role 和
Database，并让名称、密码与 `.env` 保持一致：

```bash
createuser --login --pwprompt violin_dev
createdb --owner=violin_dev violin_erp_lite
pnpm db:setup
pnpm db:migrate:status
```

`db:setup` 依次执行 Prisma Client Generate、Migration Deploy 和幂等 Seed。不得连接真实
业务数据库，也不得通过手工 SQL 初始化库存余额。

数据库初始化完成后的检查：

```bash
pg_isready -h localhost -p 5432
pnpm db:validate
pnpm db:migrate:status
```

期望 Migration 状态为全部已应用。

### 2.3 加载根目录环境变量

Prisma CLI 会通过 `prisma.config.ts` 读取根目录 `.env`。Admin 与 Mini Program 从各自
Workspace 启动，为避免复制服务端 Secret，推荐在当前 Shell 中一次性加载根目录 `.env`：

```bash
set -a
source .env
set +a
```

随后从同一个 Shell 或继承该环境的终端启动应用。不要把 Secret 复制到
`NEXT_PUBLIC_*`、`TARO_APP_*` 或客户端文件。

## 3. 启动方式

### 3.1 API 与 Admin Web

```bash
set -a
source .env
set +a
pnpm dev:admin
```

该命令先构建 `api`、`database`、`shared`，再启动 Next.js。没有独立 API 启动命令。

人工检查：

```bash
curl --fail http://localhost:3000/
curl --fail http://localhost:3000/api/health
```

期望：

- Admin 首页返回 HTTP 200；
- Health 返回 HTTP 200；
- Health 内容同时确认 Application 正常、Database Connected；
- 未登录请求 `/api/v1/products` 返回 HTTP 401，说明受保护 API 边界已生效。

### 3.2 Mini Program

另开终端并加载同一 `.env`：

```bash
set -a
source .env
set +a
pnpm dev:miniapp
```

Taro 会监听编译到 `apps/miniapp/dist`。使用微信开发者工具导入 `apps/miniapp`；仓库
`project.config.json` 已设置 `miniprogramRoot` 为 `dist/`。

当前仓库 AppID 是 `touristappid`，只适合本地编译和基础预览。真实微信登录验收必须：

1. 使用项目获批的真实 Mini Program AppID；
2. 在服务端配置 AppID、App Secret 和微信 API Base URL；
3. 确保 `TARO_APP_API_BASE_URL` 可被模拟器或真机访问；
4. 真机环境配置 HTTPS request 合法域名，不能指向手机自身的 `localhost`。

## 4. 访问地址

| 服务 | 默认地址 |
| --- | --- |
| Admin Web | `http://localhost:3000` |
| Health | `http://localhost:3000/api/health` |
| API Base | `http://localhost:3000/api/v1` |
| Mini Program 输出 | `apps/miniapp/dist` |

本次实际启动检查：

| 检查项 | 结果 |
| --- | --- |
| Admin Dev Server | Pass，Next.js Ready |
| Admin 首页 | Pass，HTTP 200 |
| API Route | Pass，未认证请求 HTTP 401 |
| Health | HTTP 503，原因是目标开发数据库尚未初始化 |
| Mini Program Watch Build | Pass，Webpack 编译成功并进入 Watching |
| 真实微信登录 | Not Executed，缺少真实 AppID/App Secret 与测试绑定 |

## 5. 测试账号

当前没有可使用的测试账号，因为 `violin_erp_lite` 开发数据库尚未创建，Seed 尚未执行。

执行 `pnpm db:setup` 后，Seed 会幂等创建或更新：

| 属性 | 值 |
| --- | --- |
| Username | `.env` 中的 `SEED_ADMIN_USERNAME`，模板默认 `dev-admin` |
| Password | `.env` 中人工设置的 `SEED_ADMIN_PASSWORD`，不写入本文档 |
| Display Name | `.env` 中的 `SEED_ADMIN_DISPLAY_NAME` |
| Role | `administrator` |
| Permission | Frozen Permission 目录全部 244 项 |
| 首次登录 | `must_change_password = true` |

Seed 不创建 Purchase、Production、Warehouse、Sales 等部门测试用户。人工角色验收账号必须由
管理员通过正式 User/Role/Scope 管理能力创建，不得在代码或文档中硬编码密码。

## 6. 人工验收顺序

1. 确认 Node 22、pnpm 11.12、PostgreSQL 18；
2. 创建并填写 `.env`；
3. 创建隔离开发数据库并运行 `pnpm db:setup`；
4. 确认 `pnpm db:migrate:status` 全部应用；
5. 加载 `.env` 后运行 `pnpm dev:admin`；
6. 确认首页 200、Health 200；
7. 使用 Seed Admin 登录并修改初始密码；
8. 验证 Master Data、Purchase、Production、Inventory、Cross-border、Sales 页面；
9. 运行 `pnpm dev:miniapp` 并用微信开发者工具导入；
10. 使用真实测试 AppID 完成微信绑定和登录验收；
11. 验收结束后不得提交 `.env`、上传文件、测试业务数据或开发数据库。

## 7. 常见问题

### `Unsupported engine`

当前 Node 不是 22.x：

```bash
nvm use
```

如本机没有 Node 22，先执行 `nvm install 22`。

### `DATABASE_URL is required`

根目录没有 `.env`，或启动应用前没有把 `.env` 加载到 Shell。创建配置并执行：

```bash
set -a
source .env
set +a
```

### `Schema engine error`、`P1001` 或 Health 503

检查：

```bash
pg_isready -h localhost -p 5432
pnpm db:migrate:status
```

确认 `DATABASE_URL` 中的 Role、Password、Database、Port 与实际 PostgreSQL 一致。本次
检查的直接原因是 `violin_dev` Role 和 `violin_erp_lite` Database 尚不存在。

### `uuidv7() does not exist`

PostgreSQL 版本低于 18。切换至 PostgreSQL 18 后重新创建空的本地开发数据库。

### `docker: command not found`

安装 Docker Desktop，或使用本文的本机 PostgreSQL 18 路径。当前电脑应使用后者。

### Seed 失败

确认 `SEED_ADMIN_PASSWORD`：

- 至少 12 个字符；
- 不是 `change-*`、`replace-*`、`password-*`、`your-*` 等占位值；
- 只存在于未跟踪的 `.env`。

### Admin 端口被占用

停止占用 3000 端口的进程，或显式使用其他 Next.js 端口，并同步
`TARO_APP_API_BASE_URL`。

### Mini Program 请求失败

确认 Admin/API 已启动；模拟器或真机能够访问 `TARO_APP_API_BASE_URL`；真实登录使用真实
AppID；开发者工具本地调试设置和 request 合法域名正确。

## 8. 本次验证结论

项目代码结构、依赖、Admin/API 启动和 Mini Program 编译均正常。当前本机尚未达到完整
人工业务验收条件，阻塞项为：

1. Node 需从 26.3.1 切换到受支持的 22.x；
2. 根目录 `.env` 尚未创建；
3. `violin_dev` Role 和 `violin_erp_lite` Database 尚未初始化；
4. Migration 与 Seed 尚未执行；
5. 没有可用测试账号；
6. 真实微信登录配置尚未提供。

完成上述初始化后，应以 Health HTTP 200 作为 Admin/API 和数据库共同就绪的启动门禁。
