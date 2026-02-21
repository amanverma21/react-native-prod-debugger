import { ReactNode } from 'react';

// ─── Gesture Configuration ──────────────────────────────────────────────────

// ─── Provider Configuration ─────────────────────────────────────────────────

/** Configuration for the DebuggerProvider. */
export interface DebuggerConfig {
  /** Whether the debugger is enabled. Defaults to `true`. */
  enabled?: boolean;

  /** Whether the debugger bubble is visible on mount. Defaults to `false`. */
  startVisible?: boolean;

  /** Auto-start console interception on mount. Defaults to `true`. */
  interceptConsole?: boolean;

  /** Auto-start network interception on mount. Defaults to `true`. */
  interceptNetwork?: boolean;

  /** Auto-start crash capturing on mount. Defaults to `true`. */
  interceptCrashes?: boolean;

  /** Maximum number of network requests to keep in memory. Defaults to `500`. */
  maxNetworkRequests?: number;

  /** Maximum number of console entries to keep in memory. Defaults to `1000`. */
  maxConsoleEntries?: number;

  /** Maximum number of timeline events to keep in memory. Defaults to `2000`. */
  maxTimelineEvents?: number;

  /** Application version string shown in Device Info. */
  appVersion?: string;

  /** Application build number shown in Device Info. */
  buildNumber?: string;

  /** Bundle identifier shown in Device Info. */
  bundleId?: string;

  /** Custom theme overrides. */
  theme?: Partial<DebuggerTheme>;

  /** List of plugin IDs to disable. */
  disabledPlugins?: string[];

  /** Bubble initial position. */
  bubblePosition?: { x: number; y: number };

  /** Bubble size in dp. Defaults to `50`. */
  bubbleSize?: number;
}

// ─── Theme ──────────────────────────────────────────────────────────────────

export interface DebuggerTheme {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  overlay: string;
  bubbleBackground: string;
  bubbleIcon: string;
  codeBackground: string;
  codeText: string;
  headerBackground: string;
  tabActive: string;
  tabInactive: string;
  statusBarOk: string;
  statusBarWarn: string;
  statusBarError: string;
  shadow: string;
}

// ─── Plugin System ──────────────────────────────────────────────────────────

/** Props passed to every plugin component. */
export interface PluginComponentProps {
  /** Current theme tokens. */
  theme: DebuggerTheme;
}

/** Definition of a debugger plugin. */
export interface DebuggerPlugin {
  /** Unique plugin identifier. */
  id: string;
  /** Display name shown in the tab bar. */
  name: string;
  /** Emoji icon for the tab. */
  icon: string;
  /** React component rendered in the plugin's tab. */
  component: React.ComponentType<PluginComponentProps>;
  /** Called when the debugger mounts. Useful for starting interceptors. */
  onInit?: () => void;
  /** Called when the debugger unmounts. Useful for cleanup. */
  onDestroy?: () => void;
  /** Plugin sort order. Lower numbers appear first. Defaults to `100`. */
  order?: number;
}

// ─── Network Inspector ──────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | string;

export interface NetworkRequest {
  /** Unique request ID. */
  id: string;
  /** HTTP method. */
  method: HttpMethod;
  /** Full URL. */
  url: string;
  /** Request start time (UNIX ms). */
  startTime: number;
  /** Request end time (UNIX ms). */
  endTime?: number;
  /** Duration in ms. */
  duration?: number;
  /** HTTP status code. */
  status?: number;
  /** Request headers. */
  requestHeaders?: Record<string, string>;
  /** Response headers. */
  responseHeaders?: Record<string, string>;
  /** Request body (string or serialized). */
  requestBody?: string;
  /** Response body (string or serialized). */
  responseBody?: string;
  /** Content type of the response. */
  responseContentType?: string;
  /** Response size in bytes. */
  responseSize?: number;
  /** Request size in bytes. */
  requestSize?: number;
  /** Whether the request errored. */
  isError?: boolean;
  /** Error message if failed. */
  errorMessage?: string;
  /** GraphQL operation name if detected. */
  gqlOperation?: string;
  /** GraphQL operation type (query/mutation/subscription). */
  gqlType?: string;
}

// ─── Console ────────────────────────────────────────────────────────────────

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleEntry {
  /** Unique entry ID. */
  id: string;
  /** Log level. */
  level: ConsoleLevel;
  /** Timestamp (UNIX ms). */
  timestamp: number;
  /** Serialized arguments. */
  message: string;
  /** Raw arguments for inspection. */
  args?: unknown[];
}

// ─── Feature Flags ──────────────────────────────────────────────────────────

export type FlagType = 'boolean' | 'string' | 'number' | 'json';

export interface FeatureFlag {
  /** Unique flag key. */
  key: string;
  /** Display label. */
  label?: string;
  /** Data type. */
  type: FlagType;
  /** Default (original) value. */
  defaultValue: boolean | string | number | object;
  /** Current (possibly overridden) value. */
  currentValue: boolean | string | number | object;
  /** Description of the flag. */
  description?: string;
  /** Group/category for organization. */
  group?: string;
}

// ─── Remote Config ──────────────────────────────────────────────────────────

export interface RemoteConfigValue {
  key: string;
  value: string | number | boolean | object;
  source: 'remote' | 'default' | 'static';
}

export interface RemoteConfigProvider {
  /** Get all config key-value pairs. */
  getAll: () => Promise<RemoteConfigValue[]> | RemoteConfigValue[];
  /** Get a single value by key. */
  getValue?: (key: string) => Promise<RemoteConfigValue | null> | RemoteConfigValue | null;
  /** Last fetch timestamp. */
  getLastFetchTime?: () => Promise<number | null> | number | null;
  /** Provider name (e.g. "Firebase", "LaunchDarkly"). */
  name?: string;
}

// ─── Storage ────────────────────────────────────────────────────────────────

export interface StorageAdapter {
  /** Adapter display name. */
  name: string;
  /** Get all keys. */
  getAllKeys: () => Promise<string[]>;
  /** Get a value by key. */
  getItem: (key: string) => Promise<string | null>;
  /** Set a value by key. */
  setItem: (key: string, value: string) => Promise<void>;
  /** Remove a key. */
  removeItem: (key: string) => Promise<void>;
  /** Clear all storage. */
  clear?: () => Promise<void>;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export type EventCategory =
  | 'network'
  | 'navigation'
  | 'state'
  | 'lifecycle'
  | 'error'
  | 'console'
  | 'custom'
  | string;

export interface TimelineEvent {
  /** Unique event ID. */
  id: string;
  /** Timestamp (UNIX ms). */
  timestamp: number;
  /** Event category for filtering. */
  category: EventCategory;
  /** Short event title. */
  title: string;
  /** Optional detailed data. */
  data?: unknown;
  /** Emoji icon. */
  icon?: string;
  /** Color hint for the UI. */
  color?: string;
}

// ─── Crash Reporter ─────────────────────────────────────────────────────────

export interface CrashEntry {
  /** Unique entry ID. */
  id: string;
  /** Timestamp (UNIX ms). */
  timestamp: number;
  /** Error message. */
  message: string;
  /** Stack trace. */
  stack?: string;
  /** Whether it was fatal. */
  isFatal: boolean;
  /** Component stack (React error boundary). */
  componentStack?: string;
}

// ─── Custom Actions ─────────────────────────────────────────────────────────

export interface CustomAction {
  /** Unique action ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Emoji icon. */
  icon?: string;
  /** Async handler executed when the action is triggered. */
  handler: () => void | Promise<void>;
  /** If true, shows a confirmation dialog before executing. */
  destructive?: boolean;
  /** Group/category for organization. */
  group?: string;
  /** Description shown under the action name. */
  description?: string;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavigationRoute {
  name: string;
  key: string;
  params?: Record<string, unknown>;
  state?: NavigationState;
}

export interface NavigationState {
  index: number;
  routes: NavigationRoute[];
  type?: string;
  stale?: boolean;
}

// ─── Internal ───────────────────────────────────────────────────────────────

export interface DebuggerContextValue {
  /** Whether the debugger is visible. */
  isVisible: boolean;
  /** Toggle overlay visibility. */
  toggle: () => void;
  /** Show the overlay. */
  show: () => void;
  /** Hide the overlay. */
  hide: () => void;
  /** Full config. */
  config: Required<DebuggerConfig>;
  /** Current theme. */
  theme: DebuggerTheme;
  /** Registered plugins. */
  plugins: DebuggerPlugin[];
}

export interface ChildrenProp {
  children: ReactNode;
}
