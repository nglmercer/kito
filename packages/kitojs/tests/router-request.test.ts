import { describe, expect, it } from "vitest";
import { middleware, router, server } from "../src";

describe("Router Request", () => {
  it("should handle basic GET request", async () => {
    const r = router();
    r.get("/hello", (ctx) => ctx.res.send("world"));

    const res = await r.request("/hello");
    expect(res.status).toBe(200);
    expect(res.body).toBe("world");
  });

  it("should handle relative path", async () => {
    const r = router();
    r.get("/hello", (ctx) => ctx.res.send("world"));

    const res = await r.request("hello");
    expect(res.status).toBe(200);
    expect(res.body).toBe("world");
  });

  it("should handle path parameters", async () => {
    const r = router();
    r.get("/users/:id", (ctx) => ctx.res.json({ id: ctx.req.params.id }));

    const res = await r.request("/users/123");
    expect(res.status).toBe(200);
    expect(res.json()).toEqual({ id: "123" });
  });

  it("should handle query parameters", async () => {
    const r = router();
    r.get("/search", (ctx) => ctx.res.json({ q: ctx.req.query.q }));

    const res = await r.request("/search?q=kito");
    expect(res.status).toBe(200);
    expect(res.json()).toEqual({ q: "kito" });
  });

  it("should handle query parameters from options", async () => {
    const r = router();
    r.get("/search", (ctx) => ctx.res.json({ q: ctx.req.query.q }));

    const res = await r.request("/search", { query: { q: "kito" } });
    expect(res.status).toBe(200);
    expect(res.json()).toEqual({ q: "kito" });
  });

  it("should handle middlewares", async () => {
    const r = router();
    const mw = middleware((ctx, next) => {
      ctx.res.header("x-mw", "true");
      return next();
    });

    r.get("/mw", [mw], (ctx) => ctx.res.send("ok"));

    const res = await r.request("/mw");
    expect(res.status).toBe(200);
    expect(res.headers["x-mw"]).toBe("true");
    expect(res.body).toBe("ok");
  });

  it("should handle headers correctly (case-insensitive and separation)", async () => {
    const r = router();
    r.get("/headers", (ctx) => {
      const reqHeader = ctx.req.header("X-Request-Header");
      ctx.res.header("X-Response-Header", `received:${reqHeader}`);
      ctx.res.send("ok");
    });

    const res = await r.request("/headers", {
      headers: { "X-Request-Header": "foo" },
    });

    expect(res.status).toBe(200);
    expect(res.headers["x-response-header"]).toBe("received:foo");
    // Request header should not leak into response headers
    expect(res.headers["x-request-header"]).toBeUndefined();
  });

  it("should work with server instance", async () => {
    const app = server();
    app.get("/ping", (ctx) => ctx.res.send("pong"));

    const res = await app.request("/ping");
    expect(res.status).toBe(200);
    expect(res.body).toBe("pong");
  });

  it("should handle 404", async () => {
    const r = router();
    r.get("/found", (ctx) => ctx.res.send("ok"));

    const res = await r.request("/not-found");
    expect(res.status).toBe(404);
  });

  it("should handle wildcard paths", async () => {
    const r = router();
    r.get("/static/*", (ctx) => ctx.res.send(ctx.req.params.path));

    const res = await r.request("/static/css/style.css");
    expect(res.status).toBe(200);
    expect(res.body).toBe("css/style.css");
  });
});
