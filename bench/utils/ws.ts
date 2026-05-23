import WebSocket from "ws";

export type WsBenchResult = {
  messagesPerSec: number;
  latencyAvg: number;
};

export function runWsBenchmark(
  url: string,
  duration: number,
  connections: number,
): Promise<WsBenchResult> {
  return new Promise((resolve) => {
    let messageCount = 0;
    let totalLatency = 0;
    const clients: WebSocket[] = [];
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    for (let i = 0; i < connections; i++) {
      const ws = new WebSocket(url);
      clients.push(ws);

      ws.on("open", () => {
        sendPing(ws);
      });

      ws.on("message", (data) => {
        const now = Date.now();
        const msg = data.toString();
        if (msg.startsWith("ping:")) {
          const sentAt = Number.parseInt(msg.split(":")[1]);
          totalLatency += now - sentAt;
          messageCount++;

          if (Date.now() < endTime) {
            sendPing(ws);
          }
        }
      });

      ws.on("error", (err) => {
        // console.error("WS client error:", err.message);
      });
    }

    function sendPing(ws: WebSocket) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`ping:${Date.now()}`);
      }
    }

    setTimeout(() => {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
        }
      }
      const actualDuration = (Date.now() - startTime) / 1000;
      resolve({
        messagesPerSec: messageCount / actualDuration,
        latencyAvg: messageCount > 0 ? totalLatency / messageCount : 0,
      });
    }, duration * 1000 + 500);
  });
}
