/**
 * react-native-prod-debugger
 *
 * A comprehensive, in-app debugging toolkit for React Native
 * that works in production builds.
 *
 * @packageDocumentation
 */

// ─── Core ────────────────────────────────────────────────────────────────────
export { DebuggerProvider } from './core/DebuggerProvider';
export { useDebugger } from './core/useDebugger';
export { PluginRegistry, registerPlugin, unregisterPlugin } from './core/PluginRegistry';

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  DebuggerConfig,
  DebuggerPlugin,
  DebuggerTheme,
  GestureType,
  NetworkRequest,
  ConsoleEntry,
  ConsoleLevel,
  FeatureFlag,
  FlagType,
  RemoteConfigProvider,
  RemoteConfigValue,
  StorageAdapter,
  TimelineEvent,
  EventCategory,
  CrashEntry,
  CustomAction,
  PluginComponentProps,
} from './core/types';

// ─── Plugin APIs ─────────────────────────────────────────────────────────────

// Network Inspector
export { NetworkInterceptor } from './plugins/network/NetworkInterceptor';

// Console Viewer
export { ConsoleInterceptor } from './plugins/console/ConsoleInterceptor';

// Feature Flags
export { registerFlag, resetFlags, getFlag } from './plugins/featureFlags/flagStore';

// State Inspector
export { setStateAdapter, removeStateAdapter } from './plugins/stateInspector/stateAdapterRegistry';
export type { StateAdapter } from './plugins/stateInspector/stateAdapterRegistry';

// Remote Config
export { setRemoteConfigProvider } from './plugins/remoteConfig/remoteConfigStore';

// Storage Browser
export {
  setStorageAdapter,
  removeStorageAdapter,
} from './plugins/storageBrowser/storageAdapterRegistry';

// Navigation Inspector
export { setNavigationRef } from './plugins/navigationInspector/navigationStore';

// Custom Actions
export { registerAction, removeAction } from './plugins/customActions/actionStore';

// Timeline / Event Logger
export { logTimelineEvent } from './plugins/timeline/timelineStore';
