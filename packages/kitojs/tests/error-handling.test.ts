import { describe, expect, it, vi, afterEach } from "vitest";
import { server, middleware } from "../src";
import type { KitoContext, NextFunction } from "../src";

describe("Error Handling", () => {
  let app: ReturnType<typeof server>;

  afterEach(() => {
    try { app.close(); } catch {}
  });

  describe("Global error handler catches route handler throws", () => {
    it("should catch error from route handler and return 500", async () => {
      const errorHandler = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ error: err.message });
      });

      app = server();
      app.use(errorHandler);
      app.get("/api/error", ({ res }) => {
        throw new Error("Something went wrong!");
      });

      const res = await app.request("/api/error");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Something went wrong!" });
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it("should catch error from route handler when error handler sends text", async () => {
      app = server();
      app.use((err: unknown, ctx: KitoContext, next: NextFunction) => {
        ctx.res.status(500).send(`Error: ${(err as Error).message}`);
      });
      app.get("/throw", () => {
        throw new Error("Boom");
      });

      const res = await app.request("/throw");
      expect(res.status).toBe(500);
      expect(res.body).toBe("Error: Boom");
    });
  });

  describe("Global error handler catches middleware throws", () => {
    it("should catch error from middleware", async () => {
      const errorHandler = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ error: err.message });
      });

      app = server();
      app.use(errorHandler);
      app.use((ctx, next) => {
        throw new Error("Middleware error!");
      });
      app.get("/api/test", ({ res }) => {
        res.json({ ok: true });
      });

      const res = await app.request("/api/test");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Middleware error!" });
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it("should catch error from middleware with path scope", async () => {
      const errorHandler = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ error: err.message });
      });

      app = server();
      app.use(errorHandler);
      app.use("/api/scoped", (ctx, next) => {
        throw new Error("Scoped middleware error!");
      });
      app.get("/api/scoped", ({ res }) => {
        res.json({ ok: true });
      });

      const res = await app.request("/api/scoped");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Scoped middleware error!" });
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Route-specific (path-scoped) error handler", () => {
    it("should use path-scoped error handler for matching routes", async () => {
      const apiErrorHandler = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ error: `API: ${err.message}` });
      });

      app = server();
      app.use("/api/", apiErrorHandler);
      app.get("/api/data", () => {
        throw new Error("DB failure");
      });

      const res = await app.request("/api/data");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "API: DB failure" });
      expect(apiErrorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handler without calling next()", () => {
    it("should not propagate error further when handler does not call next", async () => {
      app = server();
      app.use((err: unknown, ctx: KitoContext, next: NextFunction) => {
        ctx.res.status(500).json({ caught: true, msg: (err as Error).message });
      });
      app.get("/fail", () => {
        throw new Error("fail");
      });

      const res = await app.request("/fail");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ caught: true, msg: "fail" });
    });
  });

  describe("Multiple error handlers", () => {
    it("should chain multiple error handlers when next(err) is called", async () => {
      const first = vi.fn((err, ctx, next) => {
        next(err);
      });
      const second = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ handled: true });
      });

      app = server();
      app.use(first);
      app.use(second);
      app.get("/chain", () => {
        throw new Error("chain error");
      });

      const res = await app.request("/chain");
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ handled: true });
    });

    it("should skip remaining error handlers when one handles and does not call next", async () => {
      const first = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ handled: "first" });
      });
      const second = vi.fn((err, ctx, next) => {
        ctx.res.status(500).json({ handled: "second" });
      });

      app = server();
      app.use(first);
      app.use(second);
      app.get("/skip", () => {
        throw new Error("skip");
      });

      const res = await app.request("/skip");
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ handled: "first" });
    });
  });

  describe("Error from async middleware", () => {
    it("should catch error from async middleware that rejects", async () => {
      app = server();
      app.use((err: unknown, ctx: KitoContext, next: NextFunction) => {
        ctx.res.status(500).send("caught async");
      });
      app.use(async (ctx, next) => {
        await Promise.reject(new Error("async fail"));
      });
      app.get("/async", ({ res }) => {
        res.send("ok");
      });

      const res = await app.request("/async");
      expect(res.status).toBe(500);
      expect(res.body).toBe("caught async");
    });
  });

  describe("No error handler registered", () => {
    it("should throw when no error handler is registered and route throws", async () => {
      app = server();
      app.get("/crash", () => {
        throw new Error("nobody catches me");
      });

      await expect(app.request("/crash")).rejects.toThrow("nobody catches me");
    });
  });

  describe("Error handler sends response before next middleware", () => {
    it("should still get 500 response when error handler runs", async () => {
      const afterMiddleware = middleware((ctx, next) => {
        next();
      });

      app = server();
      app.use((err: unknown, ctx: KitoContext, next: NextFunction) => {
        ctx.res.status(500).json({ error: (err as Error).message });
      });
      app.get("/stop", [afterMiddleware], ({ res }) => {
        throw new Error("fail");
      });

      const res = await app.request("/stop");
      expect(res.status).toBe(500);
    });
  });

  describe("Error does NOT propagate as unhandled rejection", () => {
    it("should handle errors cleanly without crashing subsequent requests", async () => {
      app = server();
      app.use((err: unknown, ctx: KitoContext, next: NextFunction) => {
        ctx.res.status(500).json({ error: (err as Error).message });
      });
      app.get("/error", () => {
        throw new Error("test error");
      });
      app.get("/ok", ({ res }) => {
        res.json({ ok: true });
      });

      // First request hits the error
      const res1 = await app.request("/error");
      expect(res1.status).toBe(500);
      expect(res1.body).toEqual({ error: "test error" });

      // Second request should still work normally
      const res2 = await app.request("/ok");
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ ok: true });
    });
  });

  describe("Path-scoped middleware only runs on matching paths", () => {
    it("should NOT run path-scoped middleware on non-matching paths", async () => {
      const scopedMw = vi.fn((ctx, next) => next());

      app = server();
      app.use("/api/scoped", scopedMw);
      app.get("/api/other", ({ res }) => {
        res.json({ ok: true });
      });

      await app.request("/api/other");
      expect(scopedMw).not.toHaveBeenCalled();
    });
  });
});
