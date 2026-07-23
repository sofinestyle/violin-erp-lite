import { createHmac } from "node:crypto";
import {
  AppError,
  AuthenticationIdempotencyStore,
  AuthenticationRateLimiter,
  AuthenticationService,
  assertMasterDataResource,
  createRouteHandler,
  createSuccessResponse,
  extractBearerToken,
  HttpWechatIdentityAdapter,
  InventoryWorkflowService,
  JwtService,
  loadJwtConfiguration,
  loadWechatConfiguration,
  MasterDataService,
  matchInventoryWorkflowEndpoint,
  matchWorkflowEndpoint,
  parseMasterDataListQuery,
  parseLoginRequest,
  parseRefreshRequest,
  parseSecurityListQuery,
  recordAuditEvent,
  requireClientType,
  SecurityManagementService,
  WorkflowService,
  withAuthentication,
  type AuthRepository,
  type AuthenticationContext,
  type RequestContext,
  type WechatIdentityAdapter,
} from "@violin-erp/api";
import {
  createCurrentUserResolver,
  PrismaAuthRepository,
  PrismaAuditWriter,
  PrismaInventoryWorkflowRepository,
  PrismaMasterDataRepository,
  PrismaSecurityRepository,
  PrismaWorkflowRepository,
} from "@violin-erp/database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pathSegments(request: Request): string[] {
  const pathname = new URL(request.url).pathname;
  const prefix = "/api/v1/";
  if (!pathname.startsWith(prefix)) throw new AppError("RESOURCE_NOT_FOUND", 404, "接口不存在");
  return pathname.slice(prefix.length).split("/").filter(Boolean).map(decodeURIComponent);
}

function assertUuid(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new AppError("VALIDATION_INVALID_PATH", 422, "路径参数必须是 UUID");
  }
  return value;
}

function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("Idempotency-Key")?.trim();
  if (!key || key.length > 200) {
    throw new AppError("VALIDATION_IDEMPOTENCY_KEY_REQUIRED", 422, "缺少有效 Idempotency-Key");
  }
  return key;
}

const authenticationIdempotency = new AuthenticationIdempotencyStore();
const authenticationRateLimiter = new AuthenticationRateLimiter();

function authenticationFingerprint(value: unknown, purpose: string): string {
  const pepper = process.env.JWT_REFRESH_PEPPER?.trim();
  if (!pepper) throw new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, "认证服务配置不完整");
  return createHmac("sha256", pepper)
    .update(purpose)
    .update("\0")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_INVALID_JSON", 422, "请求体必须是有效 JSON");
  }
}

function services() {
  const audit = new PrismaAuditWriter();
  return {
    masterData: new MasterDataService(new PrismaMasterDataRepository(), audit),
    inventoryWorkflow: new InventoryWorkflowService(new PrismaInventoryWorkflowRepository(), audit),
    security: new SecurityManagementService(new PrismaSecurityRepository(), audit),
    workflow: new WorkflowService(new PrismaWorkflowRepository(), audit),
  };
}

const unavailableWechatAdapter: WechatIdentityAdapter = {
  exchange: async () => {
    throw new AppError("SYSTEM_SERVICE_UNAVAILABLE", 503, "微信认证服务未配置");
  },
};

function jwtService() {
  return new JwtService(
    loadJwtConfiguration({
      ...(process.env.JWT_ACCESS_EXPIRES_IN
        ? { JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN }
        : {}),
      ...(process.env.JWT_ACCESS_SECRET
        ? { JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET }
        : {}),
      ...(process.env.JWT_REFRESH_EXPIRES_IN
        ? { JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN }
        : {}),
      ...(process.env.JWT_REFRESH_PEPPER
        ? { JWT_REFRESH_PEPPER: process.env.JWT_REFRESH_PEPPER }
        : {}),
    }),
  );
}

function authService(
  repository: AuthRepository,
  jwt: JwtService,
  withWechat: boolean,
): AuthenticationService {
  if (!withWechat) {
    return new AuthenticationService(repository, jwt, unavailableWechatAdapter, "");
  }
  const configuration = loadWechatConfiguration({
    ...(process.env.WECHAT_API_BASE_URL
      ? { WECHAT_API_BASE_URL: process.env.WECHAT_API_BASE_URL }
      : {}),
    ...(process.env.WECHAT_MINI_PROGRAM_APP_ID
      ? { WECHAT_MINI_PROGRAM_APP_ID: process.env.WECHAT_MINI_PROGRAM_APP_ID }
      : {}),
    ...(process.env.WECHAT_MINI_PROGRAM_APP_SECRET
      ? { WECHAT_MINI_PROGRAM_APP_SECRET: process.env.WECHAT_MINI_PROGRAM_APP_SECRET }
      : {}),
  });
  return new AuthenticationService(
    repository,
    jwt,
    new HttpWechatIdentityAdapter(configuration),
    configuration.appId,
  );
}

function authenticationContext(
  record: Awaited<ReturnType<PrismaAuthRepository["resolveSession"]>>,
) {
  if (!record) return null;
  const dataScopes = new Set<
    "all" | "business_related" | "manufacturer_derived" | "self_created" | "store" | "warehouse"
  >(["business_related"]);
  if (record.user.roles.some((role) => role.roleCode === "purchaser")) {
    dataScopes.add("self_created");
  }
  if (record.user.warehouseScopes.length > 0) {
    dataScopes.add("warehouse");
    dataScopes.add("manufacturer_derived");
  }
  if (record.user.storeScopes.length > 0) dataScopes.add("store");
  return {
    session: {
      accessTokenExpiresAt: record.session.accessTokenExpiresAt,
      clientType: record.session.clientType,
      refreshTokenExpiresAt: record.session.refreshTokenExpiresAt,
    },
    user: {
      dataScopes: [...dataScopes],
      displayName: record.user.displayName,
      mustChangePassword: record.user.mustChangePassword,
      permissionCodes: record.user.permissions.map((item) => item.permissionCode),
      roleCodes: record.user.roles.map((item) => item.roleCode),
      roles: record.user.roles,
      storeScopes: record.user.storeScopes,
      userId: record.user.id,
      username: record.user.username,
      warehouseScopes: record.user.warehouseScopes,
      wechatBound: record.user.wechatBound,
    },
  } satisfies AuthenticationContext;
}

async function dispatchAuthentication(
  request: Request,
  context: RequestContext,
  segments: string[],
): Promise<Response | null> {
  if (segments[0] !== "auth" || segments.length !== 2) return null;
  const action = segments[1];
  const clientType = requireClientType(request);
  const repository = new PrismaAuthRepository();
  const jwt = jwtService();

  if (action === "login" && request.method === "POST") {
    const input = parseLoginRequest(await body(request));
    const rateIdentity =
      input.loginType === "wechat" ? input.wechatCode : input.username.toLocaleLowerCase("en-US");
    authenticationRateLimiter.consume(
      authenticationFingerprint(rateIdentity, `login:${input.loginType}`),
    );
    const service = authService(repository, jwt, input.loginType !== "password");
    if (input.loginType === "wechat-bind") {
      const key = requireIdempotencyKey(request);
      const fingerprint = authenticationFingerprint(input, "idempotency:wechat-bind");
      return createSuccessResponse(
        await authenticationIdempotency.execute(key, fingerprint, () =>
          service.login(input, clientType, context),
        ),
        context,
      );
    }
    return createSuccessResponse(await service.login(input, clientType, context), context);
  }
  if (action === "refresh" && request.method === "POST") {
    const service = authService(repository, jwt, false);
    const refreshToken = parseRefreshRequest(await body(request));
    authenticationRateLimiter.consume(jwt.hashRefreshToken(refreshToken));
    return createSuccessResponse(await service.refresh(refreshToken, clientType, context), context);
  }
  if (action === "logout" && request.method === "POST") {
    const claims = await jwt.verifyAccessToken(extractBearerToken(request));
    if (claims.clientType !== clientType) {
      throw new AppError("AUTH_UNAUTHORIZED", 401, "身份认证无效或已失效");
    }
    const service = authService(repository, jwt, false);
    await service.logout(claims, parseRefreshRequest(await body(request)), context);
    return createSuccessResponse({ loggedOut: true }, context);
  }
  if ((action === "session" || action === "permissions") && request.method === "GET") {
    return withAuthentication(
      request,
      jwt,
      createCurrentUserResolver(),
      async (authentication) => {
        if (action === "session") {
          return createSuccessResponse(
            {
              accessTokenExpiresAt: authentication.session!.accessTokenExpiresAt.toISOString(),
              active: true,
              clientType: authentication.session!.clientType,
              displayName: authentication.user.displayName,
              mustChangePassword: authentication.user.mustChangePassword ?? false,
              refreshTokenExpiresAt: authentication.session!.refreshTokenExpiresAt.toISOString(),
              roles: authentication.user.roles ?? [],
              userId: authentication.user.userId,
              username: authentication.user.username,
              wechatBound: authentication.user.wechatBound ?? false,
            },
            context,
          );
        }
        const warehouseScopes = authentication.user.warehouseScopes ?? [];
        const storeScopes = authentication.user.storeScopes ?? [];
        return createSuccessResponse(
          {
            dataScopes: [
              ...authentication.user.dataScopes
                .filter((type) => type !== "warehouse" && type !== "store")
                .map((type) => ({ type })),
              ...warehouseScopes.map((scope) => ({ ...scope, type: "warehouse" as const })),
              ...storeScopes.map((scope) => ({ ...scope, type: "store" as const })),
            ],
            permissions: authentication.user.permissionCodes.map((permissionCode) => {
              const [moduleCode, resourceCode, actionCode] = permissionCode.split(".");
              return {
                actionCode,
                moduleCode: `${moduleCode}.${resourceCode}`,
                permissionCode,
              };
            }),
            roles: authentication.user.roles ?? [],
            storeScopes: storeScopes.map(({ accessLevel, targetId }) => ({
              accessLevel,
              storeId: targetId,
            })),
            user: {
              displayName: authentication.user.displayName,
              id: authentication.user.userId,
              username: authentication.user.username,
            },
            warehouseScopes: warehouseScopes.map(({ accessLevel, targetId }) => ({
              accessLevel,
              warehouseId: targetId,
            })),
          },
          context,
        );
      },
      async (claims, headerClientType) => {
        const record = await repository.resolveSession(claims, headerClientType);
        const authentication = authenticationContext(record);
        return authentication ? { ...authentication, claims } : null;
      },
    );
  }
  throw new AppError("RESOURCE_NOT_FOUND", 404, "接口不存在");
}

async function dispatchWorkflow(
  request: Request,
  context: RequestContext,
  authentication: AuthenticationContext,
  segments: string[],
): Promise<Response | null> {
  const candidate = matchWorkflowEndpoint(
    request.method,
    segments,
    new URL(request.url).searchParams,
    {},
  );
  if (!candidate) return null;
  const payload =
    request.method === "GET" ? {} : ((await body(request)) as Readonly<Record<string, unknown>>);
  const matched =
    request.method === "GET"
      ? candidate
      : matchWorkflowEndpoint(
          request.method,
          segments,
          new URL(request.url).searchParams,
          payload,
        )!;
  if (matched.command.mutation && !["export"].includes(matched.command.action)) {
    requireIdempotencyKey(request);
  }
  const result = await services().workflow.execute(
    matched.command,
    matched.permission,
    authentication,
    context,
  );
  if (
    result &&
    typeof result === "object" &&
    "items" in result &&
    Array.isArray((result as { items: unknown }).items)
  ) {
    const list = result as {
      items: unknown[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    return createSuccessResponse(list.items, context, {
      meta: {
        page: list.page,
        pageSize: list.pageSize,
        total: list.total,
        totalPages: list.totalPages,
      },
    });
  }
  return createSuccessResponse(result, context, {
    status: matched.command.action.startsWith("create") ? 201 : 200,
  });
}

async function dispatchInventoryWorkflow(
  request: Request,
  context: RequestContext,
  authentication: AuthenticationContext,
  segments: string[],
): Promise<Response | null> {
  const query = new URL(request.url).searchParams;
  const candidate = matchInventoryWorkflowEndpoint(request.method, segments, query, {});
  if (!candidate) return null;
  const payload =
    request.method === "GET" ? {} : ((await body(request)) as Readonly<Record<string, unknown>>);
  const matched =
    request.method === "GET"
      ? candidate
      : matchInventoryWorkflowEndpoint(request.method, segments, query, payload)!;
  if (matched.command.mutation) requireIdempotencyKey(request);
  const result = await services().inventoryWorkflow.execute(
    matched.command,
    matched.permission,
    authentication,
    context,
  );
  if (
    result &&
    typeof result === "object" &&
    "items" in result &&
    Array.isArray((result as { items: unknown }).items)
  ) {
    const list = result as {
      items: unknown[];
      page?: number;
      pageSize?: number;
      total?: number;
      totalPages?: number;
    };
    return createSuccessResponse(list.items, context, {
      ...(list.page && list.pageSize && list.total !== undefined && list.totalPages !== undefined
        ? {
            meta: {
              page: list.page,
              pageSize: list.pageSize,
              total: list.total,
              totalPages: list.totalPages,
            },
          }
        : {}),
    });
  }
  return createSuccessResponse(result, context, {
    status: matched.command.action.startsWith("create") ? 201 : 200,
  });
}

async function dispatchMasterData(
  request: Request,
  context: RequestContext,
  authentication: AuthenticationContext,
  segments: string[],
): Promise<Response> {
  const resource = assertMasterDataResource(segments[0]!);
  const action = segments[1];
  const endpoint = services().masterData;
  const url = new URL(request.url);

  if (!action) {
    if (request.method === "GET") {
      const result = await endpoint.list(
        resource,
        parseMasterDataListQuery(resource, url.searchParams),
        authentication,
      );
      return createSuccessResponse(result.items, context, {
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    }
    if (request.method === "POST") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.create(resource, await body(request), authentication, context),
        context,
        { status: 201 },
      );
    }
  }

  if (action === "options" && request.method === "GET") {
    const includeInactive = url.searchParams.get("includeInactive");
    if (includeInactive !== null && includeInactive !== "true" && includeInactive !== "false") {
      throw new AppError("VALIDATION_INVALID_FIELD", 422, "includeInactive 只允许 true 或 false");
    }
    return createSuccessResponse(
      await endpoint.options(
        resource,
        parseMasterDataListQuery(resource, url.searchParams),
        authentication,
        includeInactive === "true",
      ),
      context,
    );
  }
  if (action === "uniqueness" && request.method === "GET") {
    return createSuccessResponse(
      await endpoint.uniqueness(resource, url.searchParams, authentication),
      context,
    );
  }

  const id = assertUuid(action);
  if (segments.length === 2 && request.method === "GET") {
    return createSuccessResponse(
      await endpoint.detail(resource, id, authentication, context),
      context,
    );
  }
  if (segments.length === 2 && request.method === "PATCH") {
    return createSuccessResponse(
      await endpoint.update(resource, id, await body(request), authentication, context),
      context,
    );
  }
  if (
    segments.length === 3 &&
    request.method === "POST" &&
    (segments[2] === "enable" || segments[2] === "disable")
  ) {
    requireIdempotencyKey(request);
    return createSuccessResponse(
      await endpoint.setActive(
        resource,
        id,
        segments[2] === "enable",
        await body(request),
        authentication,
        context,
      ),
      context,
    );
  }
  throw new AppError("RESOURCE_NOT_FOUND", 404, "接口不存在");
}

async function dispatchSecurity(
  request: Request,
  context: RequestContext,
  authentication: AuthenticationContext,
  segments: string[],
): Promise<Response> {
  const endpoint = services().security;
  const [resource, idOrAction, relation] = segments;
  const url = new URL(request.url);

  if (resource === "permissions" && segments.length === 1 && request.method === "GET") {
    const result = await endpoint.listPermissions(
      parseSecurityListQuery("permissions", url.searchParams),
      authentication,
    );
    return createSuccessResponse(result.items, context, {
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  }

  if (resource === "users" && !idOrAction) {
    if (request.method === "GET") {
      const result = await endpoint.listUsers(
        parseSecurityListQuery("users", url.searchParams),
        authentication,
      );
      return createSuccessResponse(result.items, context, {
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    }
    if (request.method === "POST") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.createUser(await body(request), authentication, context),
        context,
        { status: 201 },
      );
    }
  }

  if (resource === "roles" && !idOrAction) {
    if (request.method === "GET") {
      const result = await endpoint.listRoles(
        parseSecurityListQuery("roles", url.searchParams),
        authentication,
      );
      return createSuccessResponse(result.items, context, {
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    }
    if (request.method === "POST") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.createRole(await body(request), authentication, context),
        context,
        { status: 201 },
      );
    }
  }

  const id = assertUuid(idOrAction);
  if (resource === "users") {
    if (!relation && request.method === "GET") {
      return createSuccessResponse(await endpoint.user(id, authentication, context), context);
    }
    if (!relation && request.method === "PUT") {
      return createSuccessResponse(
        await endpoint.updateUser(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "status" && request.method === "PATCH") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.setUserActive(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "password" && request.method === "PATCH") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.resetPassword(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "roles" && request.method === "GET") {
      return createSuccessResponse(
        {
          roles: await endpoint.userRoles(id, authentication, context),
          user: await endpoint.user(id, authentication, context),
        },
        context,
      );
    }
    if (relation === "roles" && request.method === "PUT") {
      requireIdempotencyKey(request);
      await endpoint.replaceUserRoles(id, await body(request), authentication, context);
      return createSuccessResponse(
        {
          roles: await endpoint.userRoles(id, authentication, context),
          user: await endpoint.user(id, authentication, context),
        },
        context,
      );
    }
  }

  if (resource === "roles") {
    if (!relation && request.method === "GET") {
      return createSuccessResponse(await endpoint.role(id, authentication, context), context);
    }
    if (!relation && request.method === "PUT") {
      return createSuccessResponse(
        await endpoint.updateRole(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "status" && request.method === "PATCH") {
      requireIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.setRoleActive(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "permissions" && request.method === "GET") {
      return createSuccessResponse(
        {
          permissions: await endpoint.rolePermissions(id, authentication, context),
          role: await endpoint.role(id, authentication, context),
        },
        context,
      );
    }
    if (relation === "permissions" && request.method === "PUT") {
      requireIdempotencyKey(request);
      await endpoint.replaceRolePermissions(id, await body(request), authentication, context);
      return createSuccessResponse(
        {
          permissions: await endpoint.rolePermissions(id, authentication, context),
          role: await endpoint.role(id, authentication, context),
        },
        context,
      );
    }
    if ((relation === "warehouses" || relation === "stores") && request.method === "GET") {
      const role = await endpoint.role(id, authentication, context);
      return createSuccessResponse(
        {
          [relation]: await endpoint.roleScopes(id, relation, authentication, context),
          role,
          updatedAt: role.updatedAt,
        },
        context,
      );
    }
    if ((relation === "warehouses" || relation === "stores") && request.method === "PUT") {
      requireIdempotencyKey(request);
      await endpoint.replaceRoleScopes(id, relation, await body(request), authentication, context);
      const role = await endpoint.role(id, authentication, context);
      return createSuccessResponse(
        {
          [relation]: await endpoint.roleScopes(id, relation, authentication, context),
          role,
          updatedAt: role.updatedAt,
        },
        context,
      );
    }
  }

  throw new AppError("RESOURCE_NOT_FOUND", 404, "接口不存在");
}

const handler = createRouteHandler(async (request, context) => {
  const segments = pathSegments(request);
  const authenticationResponse = await dispatchAuthentication(request, context, segments);
  if (authenticationResponse) return authenticationResponse;
  extractBearerToken(request);
  const jwt = jwtService();
  const repository = new PrismaAuthRepository();
  return withAuthentication(
    request,
    jwt,
    createCurrentUserResolver(),
    async (authentication) => {
      try {
        if (segments[0] === "users" || segments[0] === "roles" || segments[0] === "permissions") {
          return await dispatchSecurity(request, context, authentication, segments);
        }
        const inventoryWorkflow = await dispatchInventoryWorkflow(
          request,
          context,
          authentication,
          segments,
        );
        if (inventoryWorkflow) return inventoryWorkflow;
        const workflow = await dispatchWorkflow(request, context, authentication, segments);
        if (workflow) return workflow;
        return await dispatchMasterData(request, context, authentication, segments);
      } catch (error) {
        if (error instanceof AppError && error.httpStatus === 403 && authentication.claims) {
          await recordAuditEvent(new PrismaAuditWriter(), {
            action: "permission.denied",
            actorUserId: authentication.user.userId,
            failureReason: "权限校验拒绝",
            moduleCode: "security",
            requestId: context.requestId,
            resourceId: authentication.claims.sessionId,
            resourceType: "auth_session",
            result: "failure",
            timestamp: new Date(context.timestamp),
            usernameSnapshot: authentication.user.username,
          });
        }
        throw error;
      }
    },
    async (claims, clientType) => {
      const record = await repository.resolveSession(claims, clientType);
      const authentication = authenticationContext(record);
      return authentication ? { ...authentication, claims } : null;
    },
  );
});

export const GET = handler;
export const PATCH = handler;
export const POST = handler;
export const PUT = handler;
