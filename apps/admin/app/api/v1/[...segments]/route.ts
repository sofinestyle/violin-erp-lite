import {
  AppError,
  assertMasterDataResource,
  createRouteHandler,
  createSuccessResponse,
  JwtService,
  loadJwtConfiguration,
  MasterDataService,
  matchWorkflowEndpoint,
  parseMasterDataListQuery,
  parseSecurityListQuery,
  SecurityManagementService,
  WorkflowService,
  withAuthentication,
  type AuthenticationContext,
  type RequestContext,
} from "@violin-erp/api";
import {
  createCurrentUserResolver,
  PrismaAuditWriter,
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

function assertIdempotencyKey(request: Request): void {
  const key = request.headers.get("Idempotency-Key")?.trim();
  if (!key || key.length > 200) {
    throw new AppError("VALIDATION_IDEMPOTENCY_KEY_REQUIRED", 422, "缺少有效 Idempotency-Key");
  }
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
    security: new SecurityManagementService(new PrismaSecurityRepository(), audit),
    workflow: new WorkflowService(new PrismaWorkflowRepository(), audit),
  };
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
    assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
    assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
      return createSuccessResponse(
        await endpoint.setUserActive(id, await body(request), authentication, context),
        context,
      );
    }
    if (relation === "password" && request.method === "PATCH") {
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
      assertIdempotencyKey(request);
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
  const jwt = new JwtService(
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
      ...(process.env.JWT_REFRESH_SECRET
        ? { JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET }
        : {}),
    }),
  );
  return withAuthentication(request, jwt, createCurrentUserResolver(), async (authentication) => {
    if (segments[0] === "users" || segments[0] === "roles" || segments[0] === "permissions") {
      return dispatchSecurity(request, context, authentication, segments);
    }
    const workflow = await dispatchWorkflow(request, context, authentication, segments);
    if (workflow) return workflow;
    return dispatchMasterData(request, context, authentication, segments);
  });
});

export const GET = handler;
export const PATCH = handler;
export const POST = handler;
export const PUT = handler;
