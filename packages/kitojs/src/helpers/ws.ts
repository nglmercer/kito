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
    const upgrade = ctx.req.upgrade;

    if (!upgrade) {
      ctx.res.status(400).json({ error: "Not a WebSocket upgrade request" });
      return;
    }

    ctx.res
      .status(101)
      .header("Upgrade", "websocket")
      .header("Connection", "Upgrade")
      .header("Sec-WebSocket-Accept", upgrade.acceptKey)
      .end();

    try {
      // Use tryRequire for the native module
      const { acceptWebsocket, wsSend, wsClose } = (await import(
        "@kitojs/kito-core"
      )) as unknown as {
        acceptWebsocket: (
          upgrade: unknown,
          onMessage: (msg: string) => void,
          onError: (err: string) => void,
          onClose: () => void,
        ) => unknown;
        wsSend: (sender: unknown, msg: string) => void;
        wsClose: (sender: unknown) => void;
      };

      const client: WebSocketClient = {
        send: (msg: string) => {
          if (sender) wsSend(sender, msg);
        },
        close: () => {
          if (sender) wsClose(sender);
        },
      };

      const sender = acceptWebsocket(
        upgrade.id,
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
        () => {
          if (client.onclose) {
            client.onclose();
          }
        },
      );

      handler(ctx, client);
    } catch (e) {
      if (!(e instanceof Error && e.message === "Response already sent")) {
        ctx.res.status(500).json({
          error: "WebSocket upgrade failed",
          // biome-ignore lint/suspicious/noExplicitAny: ...
          message: (e as any)?.message ?? String(e),
        });
      }
    }
  };
}
