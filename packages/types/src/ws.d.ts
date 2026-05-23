import type { KitoContext } from "./context";

export interface WebSocketClient {
  send(message: string): void;
  close(): void;
  onmessage?: (msg: string) => void;
  onerror?: (err: string) => void;
}

export type WebSocketHandler = (
  ctx: KitoContext,
  ws: WebSocketClient,
) => void;
