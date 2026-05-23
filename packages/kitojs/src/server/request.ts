// biome-ignore assist/source/organizeImports: ...
import type {
  CommonHeaderNames,
  KitoRequest,
  RequestHeaders,
  RequestFiles,
  UploadedFile,
} from "@kitojs/types";
import {
  getBodyBuffer,
  getHeader,
  getAllHeaders,
  getQueryParam,
  getAllQuery,
  getParam,
  getAllParams,
  getCookie,
  getAllCookies,
  getMethod,
  getUrl,
  getPathname,
  getSearch,
  getProtocol,
  getHostname,
  getIp,
  getIps,
  getSecure,
  getXhr,
  getAllFiles,
  getWebsocketUpgradeId,
  getWebsocketAcceptKey,
} from "@kitojs/kito-core";

export class RequestBuilder implements KitoRequest {
  private core: unknown;

  // biome-ignore lint/complexity/noBannedTypes: ...
  private _body?: Buffer | JSON | {};
  private _headers?: Record<string, string>;
  private _query?: Record<string, string | string[]>;
  private _params?: Record<string, string>;
  private _cookies?: Record<string, string>;
  private _method?: string;
  private _url?: string;
  private _pathname?: string;
  private _search?: string | null;
  private _protocol?: string;
  private _hostname?: string;
  private _ip?: string;
  private _ips?: string[];
  private _secure?: boolean;
  private _xhr?: boolean;
  private _files?: RequestFiles;

  constructor(requestCore: unknown) {
    this.core = requestCore;
  }

  get body(): unknown {
    if (this._body !== undefined) return this._body;

    const buf = getBodyBuffer(this.core);
    const type = this.header("content-type") ?? "";

    if (type.includes("application/json")) {
      try {
        this._body = JSON.parse(buf.toString("utf-8"));
      } catch {
        this._body = {};
      }
    } else if (type.includes("application/x-www-form-urlencoded")) {
      const params: Record<string, string | string[]> = {};
      const searchParams = new URLSearchParams(buf.toString("utf-8"));
      for (const [key, value] of searchParams.entries()) {
        if (params[key] !== undefined) {
          if (Array.isArray(params[key])) {
            (params[key] as string[]).push(value);
          } else {
            params[key] = [params[key] as string, value];
          }
        } else {
          params[key] = value;
        }
      }
      this._body = params;
    } else {
      this._body = buf;
    }

    return this._body;
  }

  json<T = unknown>(): T {
    if (typeof this.body === "object" && !Buffer.isBuffer(this.body)) {
      return this.body as T;
    }

    if (Buffer.isBuffer(this.body)) {
      return JSON.parse(this.body.toString("utf-8")) as T;
    }

    if (typeof this.body === "string") {
      return JSON.parse(this.body) as T;
    }

    return this.body as T;
  }

  text(): string {
    if (Buffer.isBuffer(this.body)) {
      return this.body.toString("utf-8");
    }

    return String(this.body);
  }

  get headers(): RequestHeaders {
    if (!this._headers) {
      this._headers = getAllHeaders(this.core);
    }
    return this._headers;
  }

  header(name: CommonHeaderNames): string | undefined;
  header(name: string): string | undefined;
  header(name: string): string | undefined {
    const value = getHeader(this.core, name.toLowerCase());
    return value ?? undefined;
  }

  get query(): Record<string, string | string[]> {
    if (!this._query) {
      this._query = getAllQuery(this.core);
    }
    return this._query;
  }

  queryParam(name: string): string | string[] | undefined {
    const value = getQueryParam(this.core, name);
    if (!value) return undefined;
    return value.length === 1 ? value[0] : value;
  }

  get params(): Record<string, string> {
    if (!this._params) {
      this._params = getAllParams(this.core);
    }
    return this._params;
  }

  param(name: string): string | undefined {
    return getParam(this.core, name) ?? undefined;
  }

  get cookies(): Record<string, string> {
    if (!this._cookies) {
      this._cookies = getAllCookies(this.core);
    }
    return this._cookies;
  }

  cookie(name: string): string | undefined {
    return getCookie(this.core, name) ?? undefined;
  }

  get method(): string {
    if (!this._method) {
      this._method = getMethod(this.core);
    }
    return this._method;
  }

  get url(): string {
    if (!this._url) {
      this._url = getUrl(this.core);
    }
    return this._url;
  }

  get pathname(): string {
    if (!this._pathname) {
      this._pathname = getPathname(this.core);
    }
    return this._pathname;
  }

  get search(): string | null {
    if (this._search === undefined) {
      this._search = getSearch(this.core) ?? null;
    }
    return this._search;
  }

  get protocol(): string {
    if (!this._protocol) {
      this._protocol = getProtocol(this.core);
    }
    return this._protocol;
  }

  get hostname(): string {
    if (!this._hostname) {
      this._hostname = getHostname(this.core);
    }
    return this._hostname;
  }

  get ip(): string {
    if (!this._ip) {
      this._ip = getIp(this.core);
    }
    return this._ip;
  }

  get ips(): string[] {
    if (!this._ips) {
      this._ips = getIps(this.core);
    }
    return this._ips;
  }

  get secure(): boolean {
    if (this._secure === undefined) {
      this._secure = getSecure(this.core);
    }
    return this._secure;
  }

  get xhr(): boolean {
    if (this._xhr === undefined) {
      this._xhr = getXhr(this.core);
    }
    return this._xhr;
  }

  get files(): RequestFiles | undefined {
    if (!this._files) {
      const coreFiles = getAllFiles(this.core);
      if (Object.keys(coreFiles).length === 0) return undefined;

      this._files = {};
      for (const [key, files] of Object.entries(coreFiles)) {
        const mappedFiles: UploadedFile[] = (files as any[]).map((f) => ({
          filename: f.filename,
          contentType: f.contentType,
          size: f.size,
          data: f.data,
          filePath: f.filePath,
          isDisk: f.isDisk,
        }));
        this._files[key] = mappedFiles.length === 1 ? mappedFiles[0] : mappedFiles;
      }
    }
    return this._files;
  }

  get originalUrl(): string {
    return this.url;
  }

  get upgrade(): import("@kitojs/types").WebSocketUpgradeInfo | undefined {
    const id = getWebsocketUpgradeId(this.core);
    if (id === null || id === undefined) return undefined;
    return {
      id: typeof id === "bigint" ? Number(id) : (id as number),
      acceptKey: getWebsocketAcceptKey(this.core) || "",
    };
  }

  accepts(...types: string[]): string | false {
    const accept = this.header("accept");
    if (!accept) return types.length > 0 ? types[0] : false;

    const preferred = parseAcceptHeader(accept, types);
    return preferred;
  }

  acceptsCharsets(...charsets: string[]): string | false {
    const acceptCharset = this.header("accept-charset");
    if (!acceptCharset) return charsets.length > 0 ? charsets[0] : false;
    return parseAcceptHeader(acceptCharset, charsets);
  }

  acceptsLanguages(...langs: string[]): string | false {
    const acceptLang = this.header("accept-language");
    if (!acceptLang) return langs.length > 0 ? langs[0] : false;
    return parseAcceptHeader(acceptLang, langs);
  }

  acceptsEncodings(...encodings: string[]): string | false {
    const acceptEncoding = this.header("accept-encoding");
    if (!acceptEncoding) return encodings.length > 0 ? encodings[0] : false;
    return parseAcceptHeader(acceptEncoding, encodings);
  }

  is(type: string): string | false {
    const ct = this.header("content-type");
    if (!ct) return false;
    const normalized = ct.split(";")[0].trim().toLowerCase();
    if (type === "*/*" || type === normalized) return normalized;
    if (type.endsWith("/*")) {
      const typeGroup = type.split("/")[0];
      if (normalized.startsWith(typeGroup + "/")) return normalized;
    }
    return false;
  }

  get fresh(): boolean {
    const method = this.method;
    if (method !== "GET" && method !== "HEAD") return false;

    const noneMatch = this.header("if-none-match");
    const modifiedSince = this.header("if-modified-since");
    if (!noneMatch && !modifiedSince) return false;

    return true;
  }

  get stale(): boolean {
    return !this.fresh;
  }

  get subdomains(): string[] {
    const hostname = this.hostname;
    if (!hostname) return [];
    const parts = hostname.split(".");
    if (parts.length <= 2) return [];
    return parts.slice(0, -2);
  }

  get raw(): {
    body: Buffer;
    headers: RequestHeaders;
    url: string;
    method: string;
  } {
    return {
      body: this.body,
      headers: this.headers,
      url: this.url,
      method: this.method,
    };
  }
}

function parseAcceptHeader(header: string, preferred: string[]): string | false {
  const items = header.split(",").map((item) => {
    const [type, ...params] = item.trim().split(";");
    let q = 1.0;
    for (const param of params) {
      const [key, val] = param.trim().split("=");
      if (key === "q" && val) q = parseFloat(val);
    }
    return { type: type.toLowerCase(), q };
  });

  items.sort((a, b) => b.q - a.q);

  for (const item of items) {
    if (preferred.length === 0) return item.type;
    for (const pref of preferred) {
      if (item.type === pref.toLowerCase()) return pref;
      if (pref.endsWith("/*")) {
        const group = pref.split("/")[0];
        if (item.type.startsWith(group + "/")) return pref;
      }
    }
  }

  return false;
}
