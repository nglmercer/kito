import type { MiddlewareDefinition } from "@kitojs/types";
import { middleware } from "./middleware";

export interface CORSOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function cors(options: CORSOptions = {}): MiddlewareDefinition {
  const {
    origin = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders,
    exposedHeaders,
    credentials,
    maxAge,
  } = options;

  return middleware((ctx, next) => {
    const reqOrigin = ctx.req.header("origin");

    if (origin === true || origin === "*") {
      ctx.res.header("Access-Control-Allow-Origin", reqOrigin || "*");
    } else if (typeof origin === "string") {
      ctx.res.header("Access-Control-Allow-Origin", origin);
    } else if (Array.isArray(origin) && reqOrigin && origin.includes(reqOrigin)) {
      ctx.res.header("Access-Control-Allow-Origin", reqOrigin);
    }

    if (credentials) {
      ctx.res.header("Access-Control-Allow-Credentials", "true");
    }

    if (exposedHeaders) {
      ctx.res.header("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    }

    if (ctx.req.method === "OPTIONS") {
      ctx.res.header("Access-Control-Allow-Methods", methods.join(", "));

      if (allowedHeaders) {
        ctx.res.header("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      } else if (reqOrigin) {
        const reqHeaders = ctx.req.header("access-control-request-headers");
        if (reqHeaders) {
          ctx.res.header("Access-Control-Allow-Headers", reqHeaders);
        }
      }

      if (maxAge !== undefined) {
        ctx.res.header("Access-Control-Max-Age", String(maxAge));
      }

      ctx.res.status(204).end();
      return;
    }

    next();
  });
}
