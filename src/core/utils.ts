import { Clipboard, Share, Platform } from 'react-native';

/** Generate a unique ID (collision-safe for debugging purposes). */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Format bytes into a human-readable string. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format milliseconds into a readable duration. */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

/** Format a UNIX timestamp into a local time string (HH:MM:SS.mmm). */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/** Format a relative time ago (e.g., "2s ago", "5m ago"). */
export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/** Truncate a string with ellipsis if it exceeds maxLength. */
export function truncate(str: string, maxLength: number = 200): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/** Safely serialize any value to a JSON string with pretty printing. */
export function safeStringify(value: unknown, indent: number = 2): string {
  try {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    if (value instanceof Error) {
      return JSON.stringify(
        { name: value.name, message: value.message, stack: value.stack },
        null,
        indent,
      );
    }
    return JSON.stringify(value, getCircularReplacer(), indent);
  } catch {
    return String(value);
  }
}

/** Safely parse a JSON string, returning null on failure. */
export function safeParse(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/** Copy text to the device clipboard. */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (Clipboard?.setString) {
      Clipboard.setString(text);
    }
  } catch {
    // Silently fail — clipboard may not be available
  }
}

/** Share text via the native share sheet. */
export async function shareText(text: string, title?: string): Promise<void> {
  try {
    await Share.share(
      { message: text, title },
      Platform.OS === 'ios' ? { subject: title } : undefined,
    );
  } catch {
    // Silently fail — share may be cancelled
  }
}

/** Get the HTTP status color based on the status code. */
export function getStatusColor(status: number | undefined): string {
  if (!status) return '#6B6B80';
  if (status < 300) return '#10B981'; // green
  if (status < 400) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

/** Get the HTTP method color. */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#3B82F6',
    POST: '#10B981',
    PUT: '#F59E0B',
    PATCH: '#A78BFA',
    DELETE: '#EF4444',
    HEAD: '#6B6B80',
    OPTIONS: '#6B6B80',
  };
  return colors[method.toUpperCase()] || '#6B6B80';
}

/** Get a console level color. */
export function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    log: '#EAEAEA',
    info: '#3B82F6',
    warn: '#F59E0B',
    error: '#EF4444',
    debug: '#A78BFA',
  };
  return colors[level] || '#EAEAEA';
}

/**
 * Extract GraphQL operation name and type from request body.
 * Returns `null` if it's not a GraphQL request.
 */
export function extractGraphQLInfo(
  body: string | undefined,
): { operation: string; type: string } | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    const query: string | undefined = parsed?.query;
    if (!query) return null;

    // Extract operation type and name
    const match = query.match(/^\s*(query|mutation|subscription)\s+(\w+)/);
    if (match) {
      return { type: match[1], operation: match[2] };
    }

    // Try named operations without explicit type
    const nameMatch = query.match(/^\s*\{\s*(\w+)/);
    if (nameMatch) {
      return { type: 'query', operation: nameMatch[1] };
    }

    return { type: 'query', operation: parsed.operationName || 'Unknown' };
  } catch {
    return null;
  }
}

/**
 * Convert a network request to a cURL command string.
 */
export function toCurl(request: {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
}): string {
  const parts: string[] = [`curl -X ${request.method}`];

  if (request.requestHeaders) {
    for (const [key, value] of Object.entries(request.requestHeaders)) {
      parts.push(`-H '${key}: ${value}'`);
    }
  }

  if (request.requestBody) {
    parts.push(`-d '${request.requestBody.replace(/'/g, "\\'")}'`);
  }

  parts.push(`'${request.url}'`);
  return parts.join(' \\\n  ');
}

/** Debounce function calls. */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Circular reference replacer for JSON.stringify.
 * Prevents "Converting circular structure to JSON" errors.
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}
