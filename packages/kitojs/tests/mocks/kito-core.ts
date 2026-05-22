import { vi } from "vitest";

export class ServerCore {
  constructor() {}
  addRoute = vi.fn();
  start = vi.fn();
  close = vi.fn();
  setConfig = vi.fn();
}

export const getBodyBuffer = vi.fn(() => Buffer.alloc(0));
export const getHeader = vi.fn();
export const getAllHeaders = vi.fn(() => ({}));
export const getQueryParam = vi.fn();
export const getAllQuery = vi.fn(() => ({}));
export const getParam = vi.fn();
export const getAllParams = vi.fn(() => ({}));
export const getCookie = vi.fn();
export const getAllCookies = vi.fn(() => ({}));
export const getMethod = vi.fn(() => "GET");
export const getUrl = vi.fn(() => "/");
export const getPathname = vi.fn(() => "/");
export const getSearch = vi.fn(() => "");
export const getProtocol = vi.fn(() => "http");
export const getHostname = vi.fn(() => "localhost");
export const getIp = vi.fn(() => "127.0.0.1");
export const getIps = vi.fn(() => ["127.0.0.1"]);
export const getSecure = vi.fn(() => false);
export const getXhr = vi.fn(() => false);
export const getAllFiles = vi.fn(() => ({}));

export const sendResponse = vi.fn();
export const startStream = vi.fn();
export const sendChunk = vi.fn();
export const endStream = vi.fn();
