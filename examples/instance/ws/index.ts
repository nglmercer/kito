import { server, ws } from "kitojs";

const VALID_TOKENS = new Set(["secret123", "admin-token"]);

const app = server();

app.get("/", ({ res }) => {
  res.send(`<!DOCTYPE html>
<html>
<body>
  <h1>Kito WebSocket Chat</h1>
  <input id="token" placeholder="Token (secret123)" value="secret123" />
  <button onclick="connect()">Connect</button>
  <div id="log"></div>
  <script>
    let ws;
    function connect() {
      const token = document.getElementById('token').value;
      ws = new WebSocket('ws://localhost:3000/ws?token=' + token);
      ws.onopen = () => log('Connected');
      ws.onmessage = (e) => log('Received: ' + e.data);
      ws.onclose = () => log('Disconnected');
    }
    function log(msg) {
      const div = document.getElementById('log');
      div.innerHTML += '<p>' + msg + '</p>';
    }
  </script>
</body>
</html>`);
});

app.get(
  "/ws",
  ws((ctx, client) => {
    const token = ctx.req.query?.token as string | undefined;

    if (!token || !VALID_TOKENS.has(token)) {
      client.send("ERROR: Invalid or missing auth token");
      client.close();
      return;
    }

    client.send("AUTH_OK: Welcome to Kito WebSocket!");

    client.onmessage = (msg: string) => {
      if (msg === "ping") {
        client.send("pong");
      } else if (msg === "close") {
        client.send("Goodbye!");
        client.close();
      } else {
        client.send(`Echo: ${msg}`);
      }
    };
  }),
);

app.listen(3000, () => {
  console.log("WS example running at http://localhost:3000");
  console.log("Valid tokens: secret123, admin-token");
});
