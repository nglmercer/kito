import { server, ws } from "kitojs";
import type { WebSocketClient } from "@kitojs/types";

type ClientEntry = {
  client: WebSocketClient;
  id: string;
  user: string;
};

class ChannelManager {
  private channels = new Map<string, Map<string, ClientEntry>>();
  private allClients = new Map<string, ClientEntry>();

  add(client: WebSocketClient, id: string, user: string) {
    this.allClients.set(id, { client, id, user });
  }

  remove(id: string) {
    this.allClients.delete(id);
    for (const members of this.channels.values()) {
      members.delete(id);
    }
  }

  join(channel: string, id: string) {
    const entry = this.allClients.get(id);
    if (!entry) return;
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map());
    }
    this.channels.get(channel)!.set(id, entry);
  }

  leave(channel: string, id: string) {
    this.channels.get(channel)?.delete(id);
  }

  broadcast(channel: string, message: string) {
    const members = this.channels.get(channel);
    if (!members) return;
    for (const { client } of members.values()) {
      client.send(message);
    }
  }

  broadcastAll(message: string) {
    for (const { client } of this.allClients.values()) {
      client.send(message);
    }
  }

  listChannels(): string[] {
    const active: string[] = [];
    for (const [name, members] of this.channels) {
      if (members.size > 0) active.push(`${name}(${members.size})`);
    }
    return active;
  }

  onlineCount(): number {
    return this.allClients.size;
  }
}

const rooms = new ChannelManager();
const port = 3002;
server()
  .get("/", ({ res }) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Kito WS Chat</title></head>
<body>
  <h1>Kito WebSocket Chat</h1>
  <input id="token" value="secret123" placeholder="token" />
  <input id="user" value="alice" placeholder="username" />
  <button onclick="connect()">Connect</button>
  <hr />
  <div id="chat" style="height:300px;overflow:auto;background:#f5f5f5;padding:8px"></div>
  <hr />
  <input id="channel" value="general" placeholder="channel" />
  <button onclick="join()">Join</button>
  <button onclick="leave()">Leave</button>
  <hr />
  <input id="msg" placeholder="message" onkeydown="if(event.key==='Enter') sendMsg()" />
  <button onclick="sendMsg()">Send to channel</button>
  <button onclick="broadcastAll()">Broadcast all</button>
  <button onclick="listChannels()">List channels</button>
  <script>
    let ws, user;
    function connect() {
      user = document.getElementById('user').value || 'anon';
      ws = new WebSocket('ws://localhost:${port}/ws?token='+document.getElementById('token').value+'&user='+user);
      ws.onopen = () => log('[connected as ' + user + ']');
      ws.onmessage = e => log(e.data);
      ws.onclose = () => log('[disconnected]');
    }
    function join() {
      ws.send(JSON.stringify({cmd:'join', channel: document.getElementById('channel').value}));
    }
    function leave() {
      ws.send(JSON.stringify({cmd:'leave', channel: document.getElementById('channel').value}));
    }
    function sendMsg() {
      const msg = document.getElementById('msg').value;
      ws.send(JSON.stringify({cmd:'channel', channel: document.getElementById('channel').value, message: msg}));
      document.getElementById('msg').value = '';
    }
    function broadcastAll() {
      ws.send(JSON.stringify({cmd:'broadcast', message: document.getElementById('msg').value || 'hello everyone!'}));
    }
    function listChannels() {
      ws.send(JSON.stringify({cmd:'channels'}));
    }
    function log(msg) {
      const d = document.getElementById('chat');
      d.innerHTML += '<div>' + msg + '</div>';
      d.scrollTop = d.scrollHeight;
    }
  </script>
</body>
</html>`);
  })
  .get(
    "/ws",
    ws((ctx, client) => {
      const token = ctx.req.query?.token as string | undefined;
      const user = ctx.req.query?.user as string | undefined;

      if (!token || !["secret123", "admin-token"].includes(token)) {
        client.send("AUTH_DENIED");
        client.close();
        return;
      }

      const clientId = `${user || "anon"}_${Date.now()}`;
      rooms.add(client, clientId, user || "anon");
      client.send(`AUTH_OK`);

      client.onmessage = (raw: string) => {
        try {
          const msg = JSON.parse(raw);
          switch (msg.cmd) {
            case "join":
              rooms.join(msg.channel, clientId);
              rooms.broadcast(
                msg.channel,
                `[${user || "anon"} joined ${msg.channel}]`,
              );
              client.send(`JOINED:${msg.channel}`);
              break;

            case "leave":
              rooms.leave(msg.channel, clientId);
              client.send(`LEFT:${msg.channel}`);
              break;

            case "channel":
              rooms.broadcast(
                msg.channel,
                `[${msg.channel}] ${user || "anon"}: ${msg.message}`,
              );
              break;

            case "broadcast":
              rooms.broadcastAll(`[ALL] ${user || "anon"}: ${msg.message}`);
              break;

            case "channels":
              client.send(
                `Channels: ${rooms.listChannels().join(", ") || "none"}`,
              );
              client.send(`Online: ${rooms.onlineCount()}`);
              break;

            case "ping":
              client.send("pong");
              break;

            default:
              client.send(`ECHO: ${raw}`);
          }
        } catch {
          client.send(`ECHO: ${raw}`);
        }
      };

      client.onclose = () => {
        rooms.remove(clientId);
        rooms.broadcastAll(`[${user || "anon"} disconnected]`);
      };
    }),
  )
  .listen(port, () => {
    console.log(`WS Chat running at http://localhost:${port}`);
    console.log(
      "Commands via JSON: join, leave, channel, broadcast, channels, ping",
    );
  });
