import type { NetworkRequest } from '../../core/types';
import { generateId, extractGraphQLInfo } from '../../core/utils';

function serializeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
  if (typeof Blob !== 'undefined' && body instanceof Blob) return `[Blob: ${body.size} bytes]`;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer)
    return `[ArrayBuffer: ${body.byteLength} bytes]`;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    return '[URLSearchParams]';
  return String(body);
}

type NetworkListener = (requests: NetworkRequest[]) => void;

/**
 * NetworkInterceptor — Intercepts XMLHttpRequest and fetch to capture network traffic.
 *
 * Uses monkey-patching to wrap the global XHR and fetch implementations.
 * Stores request/response data in an in-memory ring buffer.
 * Thread-safe listener management for UI updates.
 */
class NetworkInterceptorClass {
  private requests: NetworkRequest[] = [];
  private listeners: Set<NetworkListener> = new Set();
  private maxRequests: number = 500;
  private isActive: boolean = false;

  // Stored originals for restoring
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private originalXHRSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader | null = null;
  private originalFetch: typeof globalThis.fetch | null = null;

  /** Start intercepting network requests. */
  start(maxRequests: number = 500, forceEnable: boolean = false): void {
    if (this.isActive && !forceEnable) return;
    this.maxRequests = maxRequests;
    this.isActive = true;
    this.interceptXHR();
    this.interceptFetch();
  }

  /** Stop intercepting and restore original implementations. */
  stop(): void {
    this.isActive = false;
    this.restoreXHR();
    this.restoreFetch();
  }

  /** Subscribe to request changes. Returns unsubscribe function. */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current data
    listener(this.requests);
    return () => this.listeners.delete(listener);
  }

  /** Get all captured requests. */
  getAll(): NetworkRequest[] {
    return [...this.requests];
  }

  /** Clear all captured requests. */
  clear(): void {
    this.requests = [];
    this.notify();
  }

  /** Check if the interceptor is active. */
  get active(): boolean {
    return this.isActive;
  }

  // ─── XHR Interception ──────────────────────────────────────────────────

  private interceptXHR(): void {
    const self = this;
    const OriginalXHR = XMLHttpRequest;

    // Store originals
    this.originalXHROpen = OriginalXHR.prototype.open;
    this.originalXHRSend = OriginalXHR.prototype.send;
    this.originalXHRSetHeader = OriginalXHR.prototype.setRequestHeader;

    // Monkey-patch open
    OriginalXHR.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      const xhr = this as XMLHttpRequest & {
        _debugId: string;
        _method: string;
        _url: string;
        _requestHeaders: Record<string, string>;
      };

      xhr._debugId = generateId();
      xhr._method = method;
      xhr._url = typeof url === 'string' ? url : url.toString();
      xhr._requestHeaders = {};

      return self.originalXHROpen!.apply(this, [method, url, ...rest] as Parameters<
        typeof XMLHttpRequest.prototype.open
      >);
    };

    // Monkey-patch setRequestHeader
    OriginalXHR.prototype.setRequestHeader = function (name: string, value: string) {
      const xhr = this as XMLHttpRequest & {
        _requestHeaders: Record<string, string>;
      };
      if (xhr._requestHeaders) {
        xhr._requestHeaders[name] = value;
      }
      return self.originalXHRSetHeader!.apply(this, [name, value]);
    };

    // Monkey-patch send
    OriginalXHR.prototype.send = function (body?: string | Blob | ArrayBuffer | FormData | null) {
      const xhr = this as XMLHttpRequest & {
        _debugId: string;
        _method: string;
        _url: string;
        _requestHeaders: Record<string, string>;
      };

      const startTime = Date.now();
      const requestBody = serializeBody(body);

      // Extract GraphQL info
      const gqlInfo = extractGraphQLInfo(requestBody);

      const request: NetworkRequest = {
        id: xhr._debugId,
        method: xhr._method,
        url: xhr._url,
        startTime,
        requestHeaders: { ...xhr._requestHeaders },
        requestBody,
        requestSize: requestBody ? new Blob([requestBody]).size : 0,
        gqlOperation: gqlInfo?.operation,
        gqlType: gqlInfo?.type,
      };

      self.addRequest(request);

      // Listen for completion
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          const endTime = Date.now();
          let responseBody: string | undefined;
          try {
            const resType = xhr.responseType as string;
            if (!resType || resType === 'text' || resType === '') {
              responseBody = xhr.responseText;
            } else if (xhr.responseType === 'json') {
              responseBody =
                typeof xhr.response === 'string' ? xhr.response : JSON.stringify(xhr.response);
            } else if (xhr.responseType === 'blob' || xhr.responseType === 'arraybuffer') {
              const isBlob = xhr.responseType === 'blob';
              responseBody = isBlob
                ? `[Blob: ${xhr.response?.size || 'unknown'} bytes]`
                : `[ArrayBuffer: ${xhr.response?.byteLength || 'unknown'} bytes]`;

              // Asynchronously attempt to read the contents
              if (xhr.response && typeof FileReader !== 'undefined') {
                try {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text = reader.result;
                    if (typeof text === 'string') {
                      self.updateRequest(xhr._debugId, {
                        responseBody: text,
                        responseSize: new Blob([text]).size,
                      });
                    }
                  };
                  const blobToRead = isBlob ? xhr.response : new Blob([xhr.response]);
                  reader.readAsText(blobToRead);
                } catch {
                  // Silently ignore reader errors
                }
              }
            } else {
              responseBody = typeof xhr.response === 'string' ? xhr.response : String(xhr.response);
            }
          } catch {
            responseBody = '[Unable to read response]';
          }

          // Parse response headers
          const rawHeaders = xhr.getAllResponseHeaders();
          const responseHeaders: Record<string, string> = {};
          if (rawHeaders) {
            rawHeaders.split('\r\n').forEach((line) => {
              const idx = line.indexOf(':');
              if (idx > 0) {
                responseHeaders[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
              }
            });
          }

          self.updateRequest(xhr._debugId, {
            endTime,
            duration: endTime - startTime,
            status: xhr.status,
            responseHeaders,
            responseBody,
            responseContentType: responseHeaders['content-type'] || responseHeaders['Content-Type'],
            responseSize: responseBody ? new Blob([responseBody]).size : 0,
            isError: xhr.status >= 400 || xhr.status === 0,
            errorMessage: xhr.status === 0 ? 'Network Error' : undefined,
          });
        }
      });

      // Error handler
      const originalOnError = xhr.onerror;
      xhr.onerror = function (...args: unknown[]) {
        self.updateRequest(xhr._debugId, {
          endTime: Date.now(),
          duration: Date.now() - startTime,
          isError: true,
          errorMessage: 'Network Error',
        });
        if (typeof originalOnError === 'function') {
          originalOnError.apply(xhr, args as [ProgressEvent<EventTarget>]);
        }
      };

      return self.originalXHRSend!.apply(this, [body]);
    };
  }

  private restoreXHR(): void {
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHRSend = null;
    }
    if (this.originalXHRSetHeader) {
      XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetHeader;
      this.originalXHRSetHeader = null;
    }
  }

  // ─── Fetch Interception ────────────────────────────────────────────────

  private interceptFetch(): void {
    const self = this;
    if (typeof globalThis.fetch !== 'function') return;

    this.originalFetch = globalThis.fetch;

    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const id = generateId();
      const startTime = Date.now();

      // Extract request info
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      const method = init?.method || (input instanceof Request ? input.method : 'GET');

      const requestHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value: string, key: string) => {
            requestHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            requestHeaders[key] = value;
          });
        } else {
          Object.assign(requestHeaders, init.headers);
        }
      }

      const requestBody = serializeBody(init?.body);

      const gqlInfo = extractGraphQLInfo(requestBody);

      const request: NetworkRequest = {
        id,
        method: method.toUpperCase(),
        url,
        startTime,
        requestHeaders,
        requestBody,
        requestSize: requestBody ? new Blob([requestBody]).size : 0,
        gqlOperation: gqlInfo?.operation,
        gqlType: gqlInfo?.type,
      };

      self.addRequest(request);

      try {
        const response = await self.originalFetch!.call(globalThis, input as RequestInfo, init);
        const endTime = Date.now();

        // Clone response so the caller can still read it
        const clone = response.clone();
        let responseBody: string | undefined;
        try {
          responseBody = await clone.text();
        } catch {
          try {
            const blob = await response.clone().blob();
            responseBody = `[Blob: ${blob.size} bytes]`;

            if (typeof FileReader !== 'undefined') {
              const reader = new FileReader();
              reader.onload = () => {
                const text = reader.result;
                if (typeof text === 'string') {
                  self.updateRequest(id, {
                    responseBody: text,
                    responseSize: new Blob([text]).size,
                  });
                }
              };
              reader.readAsText(blob);
            }
          } catch {
            responseBody = '[Unable to read response body]';
          }
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value: string, key: string) => {
          responseHeaders[key] = value;
        });

        self.updateRequest(id, {
          endTime,
          duration: endTime - startTime,
          status: response.status,
          responseHeaders,
          responseBody,
          responseContentType: responseHeaders['content-type'],
          responseSize: responseBody ? new Blob([responseBody]).size : 0,
          isError: response.status >= 400,
        });

        return response;
      } catch (error) {
        const endTime = Date.now();
        self.updateRequest(id, {
          endTime,
          duration: endTime - startTime,
          isError: true,
          errorMessage: error instanceof Error ? error.message : 'Network Error',
        });
        throw error;
      }
    };
  }

  private restoreFetch(): void {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private addRequest(request: NetworkRequest): void {
    this.requests = [request, ...this.requests].slice(0, this.maxRequests);
    this.notify();
  }

  private updateRequest(id: string, update: Partial<NetworkRequest>): void {
    this.requests = this.requests.map((r) => (r.id === id ? { ...r, ...update } : r));
    this.notify();
  }

  private notify(): void {
    const snapshot = this.requests;
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}

/** Singleton network interceptor instance. */
export const NetworkInterceptor = new NetworkInterceptorClass();
