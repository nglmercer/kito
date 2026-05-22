export function start(port: number): { stop: () => void } {
  const server = Bun.serve({
    port,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        return new Response("hello world!");
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  return {
    stop: () => server.stop(),
  };
}
