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
