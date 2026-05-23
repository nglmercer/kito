// biome-ignore assist/source/organizeImports: ...
import type {
  HttpMethod,
  MiddlewareDefinition,
  SchemaDefinition,
  RouteHandler,
  MiddlewareHandler,
  ErrorMiddlewareHandler,
  RouteChain,
  KitoRouterInstance,
  RouteDefinition,
  KitoContext,
} from "@kitojs/types";

/**
 * Router class for Kito.
 * Provides HTTP routing and middleware support with the ability to mount sub-routers.
 *
 * @template TExtensions - Type of custom extensions added to the context
 *
 * @example
 * ```typescript
 * const router = new KitoRouter();
 *
 * router.get('/', ({ res }) => {
 *   res.send('Hello from router!');
 * });
 *
 * export default router;
 * ```
 */
// biome-ignore lint/complexity/noBannedTypes: ...
export class KitoRouter<
  TExtensions = {},
> implements KitoRouterInstance<TExtensions> {
  protected routes: RouteDefinition<TExtensions>[] = [];
  protected middlewares: MiddlewareDefinition[] = [];
  protected prefix = "";

  protected fuseMiddlewares<TSchema extends SchemaDefinition>(
    globals: MiddlewareDefinition[],
    routeMiddlewares: MiddlewareDefinition[],
    handler: RouteHandler<TSchema, TExtensions>,
  ): RouteHandler<TSchema, TExtensions> {
    interface FusedFunction {
      handler: MiddlewareHandler;
      path?: string;
    }
    interface FusedErrorHandler {
      handler: ErrorMiddlewareHandler;
      path?: string;
    }

    const functions: FusedFunction[] = [
      ...globals
        .filter((m) => m.type === "function" && m.handler)
        // biome-ignore lint/style/noNonNullAssertion: ...
        .map((m) => ({ handler: m.handler!, path: m.path })),
      ...routeMiddlewares
        .filter((m) => m.type === "function" && m.handler)
        // biome-ignore lint/style/noNonNullAssertion: ...
        .map((m) => ({ handler: m.handler!, path: m.path })),
    ];

    const errorHandlers: FusedErrorHandler[] = [
      ...globals
        .filter((m) => m.type === "error" && m.errorHandler)
        // biome-ignore lint/style/noNonNullAssertion: ...
        .map((m) => ({ handler: m.errorHandler!, path: m.path })),
      ...routeMiddlewares
        .filter((m) => m.type === "error" && m.errorHandler)
        // biome-ignore lint/style/noNonNullAssertion: ...
        .map((m) => ({ handler: m.errorHandler!, path: m.path })),
    ];

    if (functions.length === 0 && errorHandlers.length === 0)
      return handler as RouteHandler<TSchema, TExtensions>;

    return async (ctx: KitoContext<TSchema> & TExtensions) => {
      const pathname = ctx.req.pathname;
      const matchesPath = (mw: { path?: string }): boolean => {
        if (!mw.path) return true;
        return pathname.startsWith(mw.path);
      };

      let i = 0;
      let ei = 0;
      const next = async (err?: unknown): Promise<void> => {
        if (err) {
          while (ei < errorHandlers.length) {
            const mw = errorHandlers[ei++];
            if (!matchesPath(mw)) continue;
            await mw.handler(err, ctx, next);
            return;
          }
          throw err;
        }
        while (i < functions.length) {
          const mw = functions[i++];
          if (!matchesPath(mw)) continue;
          try {
            await mw.handler(ctx, next);
            return;
          } catch (e) {
            while (ei < errorHandlers.length) {
              const em = errorHandlers[ei++];
              if (!matchesPath(em)) continue;
              await em.handler(e, ctx, next);
              return;
            }
            throw e;
          }
        }
        try {
          await handler(ctx);
          return;
        } catch (e) {
          while (ei < errorHandlers.length) {
            const em = errorHandlers[ei++];
            if (!matchesPath(em)) continue;
            await em.handler(e, ctx, next);
            return;
          }
          throw e;
        }
      };
      return next();
    };
  }

  protected isSchemaDefinition(item: unknown): item is SchemaDefinition {
    return (
      typeof item === "object" &&
      item !== null &&
      ("params" in item ||
        "query" in item ||
        "body" in item ||
        "headers" in item)
    );
  }

  /**
   * Registers a global middleware or error handler that runs for all routes in this router.
   *
   * @param pathOrMiddleware - Path string, middleware function, or definition
   * @param maybeMiddleware - Middleware function or definition (when path is provided)
   * @returns The router instance for chaining
   *
   * @example
   * ```typescript
   * // Global middleware
   * router.use((ctx, next) => {
   *   console.log(`${ctx.req.method} ${ctx.req.url}`);
   *   next();
   * });
   *
   * // Path-scoped middleware
   * router.use('/admin', (ctx, next) => {
   *   // only runs for /admin/*
   *   next();
   * });
   *
   * // Error handler middleware
   * router.use((err, ctx, next) => {
   *   console.error(err);
   *   ctx.res.status(500).send('Internal Error');
   * });
   * ```
   */
  /**
   * Registers middleware with the router.
   *
   * @param pathOrMiddleware - Path string, or middleware definition/function
   * @param maybeMiddleware - Middleware function or definition (when path is provided)
   * @returns The router instance for chaining
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    middleware: MiddlewareHandler,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    middleware: ErrorMiddlewareHandler,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    middleware: MiddlewareDefinition,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    path: string,
    middleware: ErrorMiddlewareHandler,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    path: string,
    middleware: MiddlewareHandler | MiddlewareDefinition,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  use(
    pathOrMiddleware:
      | string
      | MiddlewareDefinition
      | MiddlewareHandler
      | ErrorMiddlewareHandler,
    maybeMiddleware?: MiddlewareDefinition | MiddlewareHandler | ErrorMiddlewareHandler,
  ): this {
    if (typeof pathOrMiddleware === "string" && maybeMiddleware) {
      const path = pathOrMiddleware;
      const mw = maybeMiddleware;
      if (typeof mw === "function") {
        if (mw.length >= 3) {
          this.middlewares.push({
            type: "error",
            errorHandler: mw as ErrorMiddlewareHandler,
            global: true,
            path,
          });
        } else {
          this.middlewares.push({
            type: "function",
            handler: mw as MiddlewareHandler,
            global: true,
            path,
          });
        }
      } else {
        this.middlewares.push({ ...mw, global: true, path });
      }
      return this;
    }

    const middleware = pathOrMiddleware as
      | MiddlewareDefinition
      | MiddlewareHandler
      | ErrorMiddlewareHandler;

    if (typeof middleware === "function") {
      if (middleware.length >= 3) {
        this.middlewares.push({
          type: "error",
          errorHandler: middleware as ErrorMiddlewareHandler,
          global: true,
        });
      } else {
        this.middlewares.push({
          type: "function",
          handler: middleware as MiddlewareHandler,
          global: true,
        });
      }
    } else {
      this.middlewares.push({ ...middleware, global: true });
    }

    return this;
  }

  /**
   * Mounts a sub-router at the specified path.
   *
   * @param path - Base path for the sub-router
   * @param router - Router instance to mount
   * @returns The router instance for chaining
   *
   * @example
   * ```typescript
   * const apiRouter = router();
   * apiRouter.get('/users', ({ res }) => res.json({ users: [] }));
   *
   * const app = server();
   * app.mount('/api', apiRouter);
   * ```
   */
  mount(path: string, router: KitoRouter<TExtensions>): this {
    const normalizedPath = this.normalizePath(path);
    const prefix = normalizedPath === "/" ? "" : normalizedPath;
    const subRouterMiddlewares = router.getMiddlewares();

    const mountedRoutes = router.getRoutes().map((route) => ({
      ...route,
      path: prefix + route.path,
      middlewares: [...subRouterMiddlewares, ...route.middlewares],
    }));

    this.routes.push(...mountedRoutes);

    return this;
  }

  /**
   * Registers a GET route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  get<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "GET",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a POST route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  post<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "POST",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a PUT route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  put<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "PUT",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a DELETE route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  delete<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "DELETE",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a PATCH route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  patch<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "PATCH",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a HEAD route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  head<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "HEAD",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers an OPTIONS route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
    schema: TSchema,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  options<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): this {
    this.addRoute<TSchema>(
      "OPTIONS",
      path,
      middlewaresOrHandler,
      handlerOrSchema,
      schema,
    );
    return this;
  }

  /**
   * Registers a route that matches all HTTP methods.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  all<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  all<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  all<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
  ): this {
    const methods: HttpMethod[] = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
      "TRACE",
      "CONNECT",
    ];
    for (const method of methods) {
      if (typeof middlewaresOrHandler === "function") {
        this.addRoute<TSchema>(
          method,
          path,
          middlewaresOrHandler,
          handlerOrSchema,
        );
      } else {
        this.addRoute<TSchema>(
          method,
          path,
          middlewaresOrHandler,
          handlerOrSchema as RouteHandler<TSchema, TExtensions>,
        );
      }
    }
    return this;
  }

  /**
   * Registers a TRACE route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  trace<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  trace<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  trace<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
  ): this {
    if (typeof middlewaresOrHandler === "function") {
      this.addRoute<TSchema>(
        "TRACE",
        path,
        middlewaresOrHandler,
        handlerOrSchema,
      );
    } else {
      this.addRoute<TSchema>(
        "TRACE",
        path,
        middlewaresOrHandler,
        handlerOrSchema as RouteHandler<TSchema, TExtensions>,
      );
    }
    return this;
  }

  /**
   * Registers a CONNECT route.
   */
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewares:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema),
    handler: RouteHandler<TSchema, TExtensions>,
  ): this;
  // biome-ignore lint/complexity/noBannedTypes: ...
  connect<TSchema extends SchemaDefinition = {}>(
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
  ): this {
    if (typeof middlewaresOrHandler === "function") {
      this.addRoute<TSchema>(
        "CONNECT",
        path,
        middlewaresOrHandler,
        handlerOrSchema,
      );
    } else {
      this.addRoute<TSchema>(
        "CONNECT",
        path,
        middlewaresOrHandler,
        handlerOrSchema as RouteHandler<TSchema, TExtensions>,
      );
    }
    return this;
  }

  /**
   * Creates a route builder for chaining multiple HTTP methods on the same path.
   *
   * @param path - Base path for all routes in the chain
   * @param routeMiddlewares - Optional middleware to apply to all routes in the chain
   * @returns Route chain builder
   *
   * @example
   * ```typescript
   * router.route('/api/users')
   *   .get(({ res }) => res.json(users))
   *   .post(({ res }) => res.json({ created: true }))
   *   .end();
   * ```
   *
   * @example With middleware
   * ```typescript
   * const auth = middleware((ctx, next) => {
   *   // authentication logic
   *   next();
   * });
   *
   * router.route('/admin', [auth])
   *   .get(({ res }) => res.send('Admin dashboard'))
   *   .post(({ res }) => res.send('Admin create'));
   * ```
   */
  route(
    path: string,
    routeMiddlewares?: MiddlewareDefinition[] | MiddlewareDefinition,
  ): RouteChain<TExtensions> {
    const self = this;

    const mergeMiddlewares = <TSchema extends SchemaDefinition>(
      callMiddlewares?:
        | (MiddlewareDefinition | TSchema)[]
        | (MiddlewareDefinition | TSchema),
    ): (MiddlewareDefinition | TSchema)[] => {
      const normalizedRouteMiddlewares = Array.isArray(routeMiddlewares)
        ? routeMiddlewares
        : routeMiddlewares
          ? [routeMiddlewares]
          : [];

      const normalizedCallMiddlewares = Array.isArray(callMiddlewares)
        ? callMiddlewares
        : callMiddlewares
          ? [callMiddlewares]
          : [];

      return [...normalizedRouteMiddlewares, ...normalizedCallMiddlewares] as (
        | MiddlewareDefinition
        | TSchema
      )[];
    };

    const chain: RouteChain<TExtensions> = {
      // biome-ignore lint/complexity/noBannedTypes: ...
      get<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "GET",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "GET",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      post<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "POST",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "POST",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      put<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "PUT",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "PUT",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      delete<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "DELETE",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "DELETE",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      patch<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "PATCH",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "PATCH",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      options<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "OPTIONS",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "OPTIONS",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      head<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "HEAD",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "HEAD",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      trace<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "TRACE",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "TRACE",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      // biome-ignore lint/complexity/noBannedTypes: ...
      connect<TSchema extends SchemaDefinition = {}>(
        middlewaresOrHandler:
          | (MiddlewareDefinition | TSchema)[]
          | (MiddlewareDefinition | TSchema)
          | RouteHandler<TSchema, TExtensions>,
        handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
      ): RouteChain<TExtensions> {
        if (typeof middlewaresOrHandler === "function") {
          self.addRoute(
            "CONNECT",
            path,
            mergeMiddlewares<TSchema>(),
            middlewaresOrHandler,
            handlerOrSchema as TSchema,
          );
        } else {
          self.addRoute(
            "CONNECT",
            path,
            mergeMiddlewares<TSchema>(middlewaresOrHandler),
            handlerOrSchema as RouteHandler<TSchema, TExtensions>,
          );
        }
        return chain;
      },

      end(): KitoRouter<TExtensions> {
        return self;
      },
    };

    return chain;
  }

  // biome-ignore lint/complexity/noBannedTypes: ...
  protected addRoute<TSchema extends SchemaDefinition = {}>(
    method: HttpMethod,
    path: string,
    middlewaresOrHandler:
      | (MiddlewareDefinition | TSchema)[]
      | (MiddlewareDefinition | TSchema)
      | RouteHandler<TSchema, TExtensions>,
    handlerOrSchema?: RouteHandler<TSchema, TExtensions> | TSchema,
    schema?: TSchema,
  ): void {
    let finalHandler: RouteHandler<TSchema, TExtensions>;
    let middlewares: (MiddlewareDefinition | TSchema)[] = [];

    if (typeof middlewaresOrHandler === "function") {
      finalHandler = middlewaresOrHandler as RouteHandler<TSchema, TExtensions>;

      if (handlerOrSchema && this.isSchemaDefinition(handlerOrSchema)) {
        middlewares = [handlerOrSchema as TSchema];
      }
    } else {
      if (Array.isArray(middlewaresOrHandler)) {
        middlewares = middlewaresOrHandler as (
          | MiddlewareDefinition
          | TSchema
        )[];
      } else {
        middlewares = [middlewaresOrHandler as MiddlewareDefinition | TSchema];
      }
      finalHandler = handlerOrSchema as RouteHandler<TSchema, TExtensions>;
    }

    if (schema) {
      middlewares.push(schema);
    }

    const normalizedPath = this.normalizePath(path);

    this.routes.push({
      method,
      path: normalizedPath,
      middlewares,
      handler: finalHandler as RouteHandler<SchemaDefinition, TExtensions>,
    });
  }

  protected getRoutes(): RouteDefinition<TExtensions>[] {
    return this.routes;
  }

  protected getMiddlewares(): MiddlewareDefinition[] {
    return this.middlewares;
  }

  /**
   * Performs a mock request to the router.
   * Useful for testing without starting a real server.
   *
   * @param path - The path to request. Can be relative to the router's base.
   * @param options - Request options (method, headers, query, body)
   *
   * @example
   * ```typescript
   * const res = await router.request('/users', { method: 'GET' });
   * expect(res.status).toBe(200);
   * ```
   */
  async request(
    path: string,
    options: {
      method?: HttpMethod;
      headers?: Record<string, string>;
      query?: Record<string, string | string[]>;
      body?: unknown;
    } = {},
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: unknown;
    json<T = unknown>(): T;
    text(): string;
  }> {
    const method = (options.method?.toUpperCase() || "GET") as HttpMethod;
    const url = new URL(path, "http://localhost");
    const normalizedPath = this.normalizePath(url.pathname);

    // Initial query from URL
    const query = { ...options.query };
    url.searchParams.forEach((value, key) => {
      if (query[key]) {
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    });

    // Find matching route
    let matchedRoute: RouteDefinition<TExtensions> | undefined;
    let params: Record<string, string> = {};

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = this.matchPath(route.path, normalizedPath);
      if (match) {
        matchedRoute = route;
        params = match.params;
        break;
      }
    }

    if (!matchedRoute) {
      return {
        status: 404,
        headers: {},
        body: "Not Found",
        json: () => {
          throw new Error("Not a JSON response");
        },
        text: () => "Not Found",
      };
    }

    // Mock Context
    const reqHeaders: Record<string, string> = {};
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        reqHeaders[key.toLowerCase()] = value;
      }
    }

    const resState: {
      status: number;
      headers: Record<string, string>;
      body: unknown;
    } = {
      status: 200,
      headers: {},
      body: undefined,
    };

    interface MockRequest {
      readonly method: string;
      readonly url: string;
      readonly pathname: string;
      readonly headers: Record<string, string>;
      readonly query: Record<string, string | string[]>;
      readonly params: Record<string, string>;
      readonly body: unknown;
      header(name: string): string | undefined;
      json<T = unknown>(): T;
      text(): string;
    }

    interface MockResponse {
      status(code: number): MockResponse;
      sendStatus(code: number): MockResponse;
      header(name: string, value: string): MockResponse;
      send(data: unknown): MockResponse;
      json(data: unknown): MockResponse;
    }

    const mockCtx: { req: MockRequest; res: MockResponse } = {
      req: {
        method,
        url: path,
        pathname: normalizedPath,
        headers: reqHeaders,
        query,
        params,
        body: options.body,
        header: (name: string) => reqHeaders[name.toLowerCase()],
        json: <T = unknown>() => options.body as T,
        text: () => String(options.body),
        upgrade: (options as any).upgrade,
      },
      res: {
        status: (code: number) => {
          resState.status = code;
          return mockCtx.res;
        },
        header: (name: string, value: string) => {
          resState.headers[name.toLowerCase()] = value;
          return mockCtx.res;
        },
        send: (data: unknown) => {
          resState.body = data;
          return mockCtx.res;
        },
        json: (data: unknown) => {
          resState.headers["content-type"] = "application/json";
          resState.body = data;
          return mockCtx.res;
        },
        sendStatus: (code: number) => {
          resState.status = code;
          return mockCtx.res;
        },
        end: () => {
          return mockCtx.res;
        },
      },
    };

    const routeMiddlewares: MiddlewareDefinition[] = [];
    for (const item of matchedRoute.middlewares) {
      if (!this.isSchemaDefinition(item)) {
        routeMiddlewares.push(item as MiddlewareDefinition);
      }
    }

    const fusedHandler = this.fuseMiddlewares(
      this.middlewares,
      routeMiddlewares,
      matchedRoute.handler,
    );

    await (fusedHandler as RouteHandler<SchemaDefinition>)(mockCtx as unknown as KitoContext<SchemaDefinition>);

    return {
      status: resState.status,
      headers: resState.headers,
      body: resState.body,
      json: <T>() => resState.body as T,
      text: () => String(resState.body),
    };
  }

  private matchPath(
    routePath: string,
    requestPath: string,
  ): { params: Record<string, string> } | null {
    const routeParts = routePath.split("/").filter(Boolean);
    const requestParts = requestPath.split("/").filter(Boolean);

    if (
      routeParts.length !== requestParts.length &&
      !routePath.includes("*") &&
      !routePath.includes("{*")
    ) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = requestPart;
      } else if (
        routePart === "*" ||
        (routePart.startsWith("{*") && routePart.endsWith("}"))
      ) {
        // Simple wildcard match for remaining parts
        params["path"] = requestParts.slice(i).join("/");
        return { params };
      } else if (routePart !== requestPart) {
        return null;
      }
    }

    return { params };
  }

  private normalizePath(path: string): string {
    let normalized = path.startsWith("/") ? path : `/${path}`;
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }
}

/**
 * Creates a new Router instance.
 *
 * @returns New router instance
 *
 * @example
 * ```typescript
 * import { router } from 'kitojs';
 *
 * const cats = router();
 *
 * cats.get('/', ({ res }) => {
 *   res.send('hello from cats!');
 * });
 *
 * export default cats;
 * ```
 */
// biome-ignore lint/complexity/noBannedTypes: ...
export function router<TExtensions = {}>(): KitoRouter<TExtensions> {
  return new KitoRouter<TExtensions>();
}
