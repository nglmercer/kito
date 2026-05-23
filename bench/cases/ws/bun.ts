export function start(port: number): { stop: () => void } {
  const server = Bun.serve({
    port,
    fetch(request, server) {
      if (server.upgrade(request)) {
        return;
      }
      return new Response("Upgrade failed", { status: 400 });
    },
    websocket: {
      message(ws, message) {
        ws.send(message);
      },
    },
  });

  return {
    stop: () => server.stop(),
  };
}
