// biome-ignore assist/source/organizeImports: ...
import type { KitoContext, WebSocketClient, WebSocketHandler, RouteHandler, SchemaDefinition } from "@kitojs/types";

/**
 * Creates a WebSocket route handler.
 * The handler receives a WebSocketClient for sending messages.
 *
 * @example
 * ```typescript
 * import { server, ws } from 'kitojs';
 *
 * const app = server();
 * app.get('/ws', ws((ctx, client) => {
 *   client.send('Welcome!');
 * }));
 * ```
 */
// biome-ignore lint/complexity/noBannedTypes: ...
export function ws<TExtensions = {}, TSchema extends SchemaDefinition = {}>(
  handler: WebSocketHandler,
): RouteHandler<TSchema, TExtensions> {
  return async (ctx: KitoContext<TSchema> & TExtensions) => {
    const req = ctx.req as Record<string, unknown>;
    const upgrade = req.upgrade as Record<string, unknown> | undefined;

    if (!upgrade) {
      ctx.res.status(400).json({ error: "Not a WebSocket upgrade request" });
      return;
    }

    try {
      // Use tryRequire for the native module
      const native = await import("@kitojs/kito-core");
      const acceptWebsocket = native.acceptWebsocket as (
        upgrade: unknown,
        onMessage: (msg: string) => void,
        onError: (err: string) => void,
        onClose: () => void,
      // biome-ignore lint/suspicious/noExplicitAny: ...
      ) => any;
      const wsSend = native.wsSend as (sender: unknown, msg: string) => void;
      const wsClose = native.wsClose as (sender: unknown) => void;

      const client: WebSocketClient = {
        send: () => {},
        close: () => {},
      };

      const sender = acceptWebsocket(
        upgrade,
        (msg: string) => {
          if (client.onmessage) {
            client.onmessage(msg);
          }
        },
        (err: string) => {
          if (client.onerror) {
            client.onerror(err);
          } else {
            console.error("WebSocket error:", err);
          }
        },
        () => {},
      );

      client.send = (msg: string) => wsSend(sender, msg);
      client.close = () => wsClose(sender);

      handler(ctx, client);
    } catch (e) {
      ctx.res.status(500).json({
        error: "WebSocket upgrade failed",
        // biome-ignore lint/suspicious/noExplicitAny: ...
        message: (e as any)?.message ?? String(e),
      });
    }
  };
}
