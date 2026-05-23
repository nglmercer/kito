import { server, ws } from "kitojs";

export function start(port: number): { stop: () => void } {
  const app = server();

  app.get(
    "/ws",
    ws((_ctx, client) => {
      client.onmessage = (msg) => {
        client.send(msg);
      };
    }),
  );

  app.listen(port);

  return {
    stop: async () => app.close(),
  };
}
