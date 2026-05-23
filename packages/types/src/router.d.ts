import type {
  ErrorMiddlewareHandler,
  MiddlewareHandler,
  RouteHandler,
} from "./handlers";
import type { MiddlewareDefinition, RouteChain } from "./routes";
import type { SchemaDefinition } from "./schema/base";

// biome-ignore lint/complexity/noBannedTypes: ...
export interface KitoRouterInstance<TExtensions = {}> {
  use(
    middleware: MiddlewareHandler,
  ): KitoRouterInstance<TExtensions>;
  use(
    middleware: ErrorMiddlewareHandler,
  ): KitoRouterInstance<TExtensions>;
  use(
    middleware: MiddlewareDefinition,
  ): KitoRouterInstance<TExtensions>;
  use(
    path: string,
    middleware: ErrorMiddlewareHandler,
  ): KitoRouterInstance<TExtensions>;
  use(
    path: string,
    middleware: MiddlewareHandler | MiddlewareDefinition,
  ): KitoRouterInstance<TExtensions>;

  mount(
    path: string,
    router: KitoRouterInstance<TExtensions>,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  all<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  all<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  trace<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  trace<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;

  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): KitoRouterInstance<TExtensions>;

  route(path: string): RouteChain<TExtensions>;
  route(
    path: string,
    middlewares: MiddlewareDefinition[] | MiddlewareDefinition,
  ): RouteChain<TExtensions>;

  request(
    path: string,
    options?: {
      method?: HttpMethod;
      headers?: Record<string, string>;
      query?: Record<string, string | string[]>;
      body?: unknown;
    },
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: unknown;
    json<T = unknown>(): T;
    text(): string;
  }>;
}
