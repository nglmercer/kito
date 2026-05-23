import type { KitoContext } from "./context";
import type { SchemaDefinition } from "./schema/base";

export type NextFunction = () => void | Promise<void>;

export type MiddlewareHandler<TSchema = unknown, TExtensions = unknown> = (
  ctx: KitoContext<TSchema> & TExtensions,
  next: NextFunction,
) => void | Promise<void>;

export type ErrorMiddlewareHandler<TSchema = unknown, TExtensions = unknown> = (
  err: unknown,
  ctx: KitoContext<TSchema> & TExtensions,
  next: NextFunction,
) => void | Promise<void>;

export type RouteHandler<TSchema extends SchemaDefinition, TExtensions> = (
  ctx: KitoContext<TSchema> & TExtensions,
) => void | Promise<void> | unknown | Promise<unknown>;
