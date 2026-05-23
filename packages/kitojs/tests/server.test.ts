// biome-ignore assist/source/organizeImports: ...
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { server, middleware, schema, t } from "../src";
import * as net from "node:net";

describe("Server", () => {
  let app: ReturnType<typeof server>;

  beforeEach(() => {
    app = server();
  });

  afterEach(() => {
    if (app) {
      app.close();
    }
  });

  describe("Creation", () => {
    it("should create server instance", () => {
      expect(app).toBeDefined();
      expect(typeof app.get).toBe("function");
      expect(typeof app.post).toBe("function");
      expect(typeof app.listen).toBe("function");
    });

    it("should create server with options", () => {
      const appWithOptions = server({ port: 4000, host: "127.0.0.1" });
      expect(appWithOptions).toBeDefined();
      appWithOptions.close();
    });
  });

  describe("Route Registration", () => {
    it("should register GET route", () => {
      expect(() => {
        app.get("/", (ctx) => {
          ctx.res.send("hello");
        });
      }).not.toThrow();
    });

    it("should register POST route", () => {
      expect(() => {
        app.post("/users", (ctx) => {
          ctx.res.json({ success: true });
        });
      }).not.toThrow();
    });

    it("should register PUT route", () => {
      expect(() => {
        app.put("/users/:id", (ctx) => {
          ctx.res.send("updated");
        });
      }).not.toThrow();
    });

    it("should register DELETE route", () => {
      expect(() => {
        app.delete("/users/:id", (ctx) => {
          ctx.res.sendStatus(204);
        });
      }).not.toThrow();
    });

    it("should register PATCH route", () => {
      expect(() => {
        app.patch("/users/:id", (ctx) => {
          ctx.res.send("patched");
        });
      }).not.toThrow();
    });

    it("should register route with schema", () => {
      const userSchema = schema({
        params: t.object({ id: t.str().uuid() }),
      });

      expect(() => {
        app.get("/users/:id", [userSchema], (ctx) => {
          ctx.res.json({ id: ctx.req.params.id });
        });
      }).not.toThrow();
    });

    it("should register route with middleware", () => {
      const auth = middleware((_, next) => {
        next();
      });

      expect(() => {
        app.get("/protected", [auth], (ctx) => {
          ctx.res.send("secret");
        });
      }).not.toThrow();
    });

    it("should register route with multiple middlewares", () => {
      const auth = middleware((_, next) => next());
      const logger = middleware((_, next) => next());

      expect(() => {
        app.get("/admin", [auth, logger], (ctx) => {
          ctx.res.send("admin");
        });
      }).not.toThrow();
    });
  });

  describe("Global Middleware", () => {
    it("should register global middleware", () => {
      const globalMw = middleware((_, next) => {
        next();
      });

      expect(() => {
        app.use(globalMw);
      }).not.toThrow();
    });

    it("should register global middleware as function", () => {
      expect(() => {
        app.use((_, next) => {
          next();
        });
      }).not.toThrow();
    });
  });

  describe("Extension", () => {
    it("should extend context", () => {
      const extendedApp = app.extend<{ db: { query: () => string } }>((ctx) => {
        ctx.db = { query: () => "result" };
      });

      expect(extendedApp).toBeDefined();
      extendedApp.close();
    });

    it("should extend context with return value", () => {
      const extendedApp = app.extend<{ user: { id: string } }>((_) => {
        return { user: { id: "123" } };
      });

      expect(extendedApp).toBeDefined();
      extendedApp.close();
    });

    it("should chain multiple extensions", () => {
      const extended = app
        // biome-ignore lint/suspicious/noExplicitAny: ...
        .extend<{ db: any }>((_) => ({ db: {} }))
        // biome-ignore lint/suspicious/noExplicitAny: ...
        .extend<{ cache: any }>((_) => ({ cache: {} }));

      expect(extended).toBeDefined();
      extended.close();
    });
  });

  describe("Listen", () => {
    it("should have listen method", () => {
      expect(typeof app.listen).toBe("function");
    });

    it("should have close method", () => {
      expect(typeof app.close).toBe("function");
    });
  });

  describe("Port Conflict", () => {
    it("should allow port reuse with reusePort enabled", async () => {
      const server1 = server({ port: 9877, reusePort: true });
      server1.listen();

      const server2 = server({ port: 9877, reusePort: true });
      server2.listen();

      server1.close();
      server2.close();
    }, 15000);
  });

  describe("Server Configuration", () => {
    it("should pass maxRequestSize to core config", async () => {
      const testApp = server({ port: 9879, maxRequestSize: 1024 });
      const config = await testApp.listen();
      expect(config.maxRequestSize).toBe(1024);
      testApp.close();
    });

    it("should pass uploadConfig to core config", async () => {
      const testApp = server({
        port: 9880,
        uploadConfig: {
          memoryThreshold: 1024,
          maxFileSize: 10 * 1024 * 1024,
          maxTotalSize: 100 * 1024 * 1024,
          tempDir: "/tmp",
        },
      });
      const config = await testApp.listen();
      expect(config.uploadConfig).toBeDefined();
      expect(config.uploadConfig?.memoryThreshold).toBe(1024);
      expect(config.uploadConfig?.tempDir).toBe("/tmp");
      testApp.close();
    });

    it("should pass trustProxy to core config", async () => {
      const testApp = server({ port: 9881, trustProxy: true });
      const config = await testApp.listen();
      expect(config.trustProxy).toBe(true);
      testApp.close();
    });

    it("should handle listen with custom host", async () => {
      const testApp = server({ port: 9882, host: "127.0.0.1" });
      const config = await testApp.listen();
      expect(config.host).toBe("127.0.0.1");
      testApp.close();
    });
  });

  describe("Server Start/Stop Lifecycle", () => {
    it("should start and stop server", async () => {
      const testApp = server({ port: 9883 });
      const config = await testApp.listen();
      expect(config.port).toBe(9883);
      expect(() => testApp.close()).not.toThrow();
    });

    it("should start and stop multiple times", async () => {
      const testApp = server({ port: 9884 });
      await testApp.listen();
      testApp.close();

      await testApp.listen();
      testApp.close();
    });

    it("should serve request via app.request()", async () => {
      const testApp = server();
      testApp.get("/hello", (ctx) => ctx.res.send("world"));

      const res = await testApp.request("/hello");
      expect(res.status).toBe(200);
      expect(res.body).toBe("world");
    });
  });
});
