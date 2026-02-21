import React, { createContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { DebuggerConfig, DebuggerContextValue, DebuggerPlugin, ChildrenProp } from './types';
import { createTheme } from './theme';
import { PluginRegistry } from './PluginRegistry';
import { DebugBubble } from './DebugBubble';
import { DebugOverlay } from './DebugOverlay';

// ─── Built-in Plugin Registrations ──────────────────────────────────────────
import { createNetworkInspectorPlugin } from '../plugins/network/NetworkInspectorPlugin';
import { createStateInspectorPlugin } from '../plugins/stateInspector/StateInspectorPlugin';
import { createFeatureFlagsPlugin } from '../plugins/featureFlags/FeatureFlagsPlugin';
import { createRemoteConfigPlugin } from '../plugins/remoteConfig/RemoteConfigPlugin';
import { createConsoleViewerPlugin } from '../plugins/console/ConsoleViewerPlugin';
import { createStorageBrowserPlugin } from '../plugins/storageBrowser/StorageBrowserPlugin';
import { createPerformanceMonitorPlugin } from '../plugins/performance/PerformanceMonitorPlugin';
import { createDeviceInfoPlugin } from '../plugins/deviceInfo/DeviceInfoPlugin';
import { createNavigationInspectorPlugin } from '../plugins/navigationInspector/NavigationInspectorPlugin';
import { createCrashReporterPlugin } from '../plugins/crashReporter/CrashReporterPlugin';
import { createCustomActionsPlugin } from '../plugins/customActions/CustomActionsPlugin';
import { createDeepLinkTesterPlugin } from '../plugins/deepLinkTester/DeepLinkTesterPlugin';
import { createTimelinePlugin } from '../plugins/timeline/TimelinePlugin';

// ─── Context ────────────────────────────────────────────────────────────────

export const DebuggerContext = createContext<DebuggerContextValue | null>(null);

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<DebuggerConfig> = {
  enabled: true,
  startVisible: false,
  interceptConsole: true,
  interceptNetwork: true,
  interceptCrashes: true,
  maxNetworkRequests: 500,
  maxConsoleEntries: 1000,
  maxTimelineEvents: 2000,
  appVersion: '',
  buildNumber: '',
  bundleId: '',
  theme: {},
  disabledPlugins: [],
  bubblePosition: { x: -1, y: -1 },
  bubbleSize: 50,
};

// ─── Provider ───────────────────────────────────────────────────────────────

interface DebuggerProviderProps extends ChildrenProp {
  config?: DebuggerConfig;
}

/**
 * DebuggerProvider — Wrap your app with this to enable the production debugger.
 *
 * @example
 * ```tsx
 * import { DebuggerProvider } from 'react-native-prod-debugger';
 *
 * export default function App() {
 *   return (
 *     <DebuggerProvider config={{ appVersion: '1.2.3' }}>
 *       <YourApp />
 *     </DebuggerProvider>
 *   );
 * }
 * ```
 */
export const DebuggerProvider: React.FC<DebuggerProviderProps> = ({
  children,
  config: userConfig,
}) => {
  const mergedConfig = useMemo<Required<DebuggerConfig>>(
    () => ({
      ...DEFAULT_CONFIG,
      ...userConfig,
      theme: { ...DEFAULT_CONFIG.theme, ...(userConfig?.theme || {}) },
    }),
    [userConfig],
  );

  const theme = useMemo(() => createTheme(mergedConfig.theme), [mergedConfig.theme]);

  const [isVisible, setIsVisible] = useState(mergedConfig.startVisible);
  const [showOverlay, setShowOverlay] = useState(false);
  const [plugins, setPlugins] = useState<DebuggerPlugin[]>([]);
  const initialized = useRef(false);

  // Register built-in plugins on mount
  useEffect(() => {
    if (!mergedConfig.enabled || initialized.current) return;
    initialized.current = true;

    const disabled = new Set(mergedConfig.disabledPlugins);

    const builtInPlugins = [
      createNetworkInspectorPlugin(),
      createConsoleViewerPlugin(),
      createStateInspectorPlugin(),
      createFeatureFlagsPlugin(),
      createRemoteConfigPlugin(),
      createStorageBrowserPlugin(),
      createPerformanceMonitorPlugin(),
      createDeviceInfoPlugin(),
      createNavigationInspectorPlugin(),
      createCrashReporterPlugin(),
      createCustomActionsPlugin(),
      createDeepLinkTesterPlugin(),
      createTimelinePlugin(),
    ];

    const pluginsToRegister: DebuggerPlugin[] = [];
    for (const plugin of builtInPlugins) {
      if (!disabled.has(plugin.id)) {
        pluginsToRegister.push(plugin);
      }
    }
    PluginRegistry.registerBatch(pluginsToRegister);

    PluginRegistry.initAll();
    setPlugins(PluginRegistry.getAll());

    // Subscribe to registry changes (for custom plugins added later)
    const unsubscribe = PluginRegistry.subscribe(() => {
      setPlugins(PluginRegistry.getAll());
    });

    return () => {
      unsubscribe();
      PluginRegistry.destroyAll();
      initialized.current = false;
    };
  }, [mergedConfig.enabled, mergedConfig.disabledPlugins]);

  const show = useCallback(() => {
    setIsVisible(true);
    setShowOverlay(false);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setShowOverlay(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
    setShowOverlay(false);
  }, []);

  const handleBubblePress = useCallback(() => {
    setShowOverlay(true);
  }, []);

  const handleOverlayClose = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const contextValue = useMemo<DebuggerContextValue>(
    () => ({
      isVisible,
      toggle,
      show,
      hide,
      config: mergedConfig,
      theme,
      plugins,
    }),
    [isVisible, toggle, show, hide, mergedConfig, theme, plugins],
  );

  if (!mergedConfig.enabled) {
    return <>{children}</>;
  }

  return (
    <DebuggerContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}

        {isVisible && !showOverlay && (
          <DebugBubble
            onPress={handleBubblePress}
            theme={theme}
            size={mergedConfig.bubbleSize}
            initialPosition={
              mergedConfig.bubblePosition.x >= 0 ? mergedConfig.bubblePosition : undefined
            }
          />
        )}

        {isVisible && showOverlay && (
          <DebugOverlay plugins={plugins} theme={theme} onClose={handleOverlayClose} />
        )}
      </View>
    </DebuggerContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
