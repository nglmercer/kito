export class ServerCore {
  constructor() {}
  addRoute = () => {};
  start = () => {};
  close = () => {};
  setConfig = () => {};
}

export const getBodyBuffer = () => Buffer.alloc(0);
export const getHeader = () => "";
export const getAllHeaders = () => ({});
export const getQueryParam = () => "";
export const getAllQuery = () => ({});
export const getParam = () => "";
export const getAllParams = () => ({});
export const getCookie = () => "";
export const getAllCookies = () => ({});
export const getMethod = () => "GET";
export const getUrl = () => "/";
export const getPathname = () => "/";
export const getSearch = () => "";
export const getProtocol = () => "http";
export const getHostname = () => "localhost";
export const getIp = () => "127.0.0.1";
export const getIps = () => ["127.0.0.1"];
export const getSecure = () => false;
export const getXhr = () => false;
export const getAllFiles = () => ({});

export const sendResponse = () => {};
export const startStream = () => {};
export const sendChunk = () => {};
export const endStream = () => {};

// WebSocket mocks
export const acceptWebsocket = (
  _upgrade: unknown,
  onMessage: (msg: string) => void,
  _onError: (err: string) => void,
  _onClose: () => void,
) => {
  const sender = { send: (_msg: string) => {}, close: () => {} };
  // Store callbacks for test assertions
  (sender as Record<string, unknown>).onMessage = onMessage;
  return sender;
};

export const wsSend = (_sender: unknown, _msg: string) => {};
export const wsClose = (_sender: unknown) => {};

export const getWebsocketUpgradeId = () => null;
