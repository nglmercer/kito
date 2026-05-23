import { describe, it, expect } from "vitest";
import { server, ws } from "../src";

describe("WebSocket", () => {
  describe("ws() helper", () => {
    it("should create a route handler", () => {
      const app = server();
      expect(() => {
        app.get("/ws", ws((_ctx, _client) => {}));
      }).not.toThrow();
      app.close();
    });

    it("should return 400 if request has no upgrade header", async () => {
      const app = server();
      app.get("/ws", ws((_ctx, _client) => {}));

      const res = await app.request("/ws");
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe("Not a WebSocket upgrade request");
      app.close();
    });

    it("should accept a ws handler on any method", () => {
      const app = server();
      expect(() => {
        app.post("/ws", ws((_ctx, _client) => {}));
        app.put("/ws", ws((_ctx, _client) => {}));
        app.delete("/ws", ws((_ctx, _client) => {}));
      }).not.toThrow();
      app.close();
    });

    it("should register multiple WS routes", () => {
      const app = server();
      expect(() => {
        app.get("/chat", ws((_ctx, _client) => {}));
        app.get("/notifications", ws((_ctx, _client) => {}));
      }).not.toThrow();
      app.close();
    });

    it("should handle a successful WebSocket upgrade", async () => {
      const app = server();
      let handlerCalled = false;
      let sentMessage = "";

      app.get(
        "/ws",
        ws((_ctx, client) => {
          handlerCalled = true;
          client.send("hello");
        }),
      );

      // Mock wsSend to capture the message
      const core = (await import("@kitojs/kito-core")) as any;
      core.setWsSend((_sender: any, msg: string) => {
        sentMessage = msg;
      });

      await app.request("/ws", {
        upgrade: { id: 123 },
      } as any);

      expect(handlerCalled).toBe(true);
      expect(sentMessage).toBe("hello");
      app.close();
    });
  });
});
