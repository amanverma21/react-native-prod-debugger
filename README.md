# 🐛 react-native-prod-debugger

A comprehensive, **zero-dependency**, in-app debugging toolkit for React Native that works in **production builds**.

Activated by a hidden gesture (3-finger long press), it provides a floating debug bubble that opens a rich overlay panel with **13+ built-in tools** — no external desktop app, no dev-only restrictions.

---

## ✨ Features

| #   | Tool                     | Description                                                                                                                 |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 🌐  | **Network Inspector**    | Full HTTP traffic monitor — request/response headers & bodies, status codes, duration, size, GraphQL detection, cURL export |
| 📋  | **Console Viewer**       | Intercepted `console.log/warn/error/info/debug` with level filters, search, and copy                                        |
| 🔍  | **State Inspector**      | Live state tree viewer for Redux, Zustand, MobX, or any custom store                                                        |
| 🚩  | **Feature Flags**        | Toggle boolean flags, edit string/number/JSON values at runtime with group filtering                                        |
| ⚙️  | **Remote Config**        | View Firebase Remote Config or any custom provider with refresh & search                                                    |
| 💾  | **Storage Browser**      | Browse, edit, and delete AsyncStorage / MMKV entries with JSON formatting                                                   |
| ⚡  | **Performance Monitor**  | Real-time FPS counter, JS thread latency, memory usage, historical chart                                                    |
| 📱  | **Device Info**          | Platform, OS version, Hermes status, screen dimensions, scale                                                               |
| 🧭  | **Navigation Inspector** | Current route, params, full state tree, and route history                                                                   |
| 💥  | **Crash Reporter**       | Captures unhandled JS errors and promise rejections with stack traces                                                       |
| 🎯  | **Custom Actions**       | Register developer shortcuts (clear cache, force logout, etc.)                                                              |
| 🔗  | **Deep Link Tester**     | Test deep links with presets, URL validation, and history                                                                   |
| 📊  | **Timeline**             | Visual event logger with category filtering and time deltas                                                                 |

---

## 📦 Installation

```bash
# npm
npm install react-native-prod-debugger

# yarn
yarn add react-native-prod-debugger

# bun
bun add react-native-prod-debugger
```

**Zero native dependencies** — no pod install or native linking required.

---

## 🚀 Quick Start

### 1. Wrap Your App

```tsx
import { DebuggerProvider } from 'react-native-prod-debugger';

export default function App() {
  return (
    <DebuggerProvider config={{ appVersion: '1.2.3' }}>
      <YourApp />
    </DebuggerProvider>
  );
}
```

### 2. Activate

**3-finger long press** (800ms) anywhere in your app to toggle the debug bubble.

Tap the 🐛 bubble to open the full debug overlay.

That's it! All 13 tools are ready to use.

---

## 🔧 Configuration

```tsx
<DebuggerProvider
  config={{
    enabled: true, // Toggle debugger on/off
    gesture: 'threeFingerLongPress', // 'threeFingerLongPress' | 'twoFingerTripleTap' | 'shake' | 'custom'
    longPressDuration: 800, // Duration in ms
    numberOfFingers: 3, // Number of fingers required
    interceptConsole: true, // Auto-start console interception
    interceptNetwork: true, // Auto-start network interception
    interceptCrashes: true, // Auto-start crash capturing
    maxNetworkRequests: 500, // Max network entries in memory
    maxConsoleEntries: 1000, // Max console entries in memory
    appVersion: '1.2.3', // Shown in Device Info
    buildNumber: '42', // Shown in Device Info
    bundleId: 'com.myapp', // Shown in Device Info
    disabledPlugins: ['timeline'], // Disable specific plugins by ID
    bubbleSize: 50, // Debug bubble size in dp
    theme: {
      // Custom theme overrides
      accent: '#FF6B6B',
      background: '#1A1A2E',
    },
  }}
>
  <App />
</DebuggerProvider>
```

---

## 🔌 Plugin Integration

### State Inspector (Redux)

```tsx
import { setStateAdapter } from 'react-native-prod-debugger';

// After creating your Redux store:
setStateAdapter('redux', {
  name: 'Redux Store',
  getState: () => store.getState(),
  subscribe: (callback) => store.subscribe(callback),
});
```

### State Inspector (Zustand)

```tsx
import { setStateAdapter } from 'react-native-prod-debugger';

setStateAdapter('user-store', {
  name: 'User Store',
  getState: () => useUserStore.getState(),
  subscribe: (callback) => useUserStore.subscribe(callback),
});
```

### Feature Flags

```tsx
import { registerFlag, getFlag } from 'react-native-prod-debugger';

registerFlag({
  key: 'dark_mode',
  type: 'boolean',
  defaultValue: false,
  label: 'Dark Mode',
  description: 'Enable dark mode across the app',
  group: 'UI',
});

registerFlag({
  key: 'api_timeout',
  type: 'number',
  defaultValue: 30000,
  label: 'API Timeout',
  group: 'Network',
});

// Read flag values
const isDarkMode = getFlag('dark_mode'); // boolean
```

### Remote Config (Firebase)

```tsx
import { setRemoteConfigProvider } from 'react-native-prod-debugger';
import remoteConfig from '@react-native-firebase/remote-config';

setRemoteConfigProvider({
  name: 'Firebase',
  getAll: () => {
    const values = remoteConfig().getAll();
    return Object.entries(values).map(([key, entry]) => ({
      key,
      value: entry.asString(),
      source: entry.getSource() === 'remote' ? 'remote' : 'default',
    }));
  },
  getLastFetchTime: () => remoteConfig().lastFetchTime,
});
```

### Storage Browser (AsyncStorage)

```tsx
import { setStorageAdapter } from 'react-native-prod-debugger';
import AsyncStorage from '@react-native-async-storage/async-storage';

setStorageAdapter('async-storage', {
  name: 'AsyncStorage',
  getAllKeys: () => AsyncStorage.getAllKeys(),
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});
```

### Navigation Inspector

```tsx
import { setNavigationRef } from 'react-native-prod-debugger';
import { NavigationContainer } from '@react-navigation/native';

const navigationRef = useRef(null);

<NavigationContainer ref={navigationRef} onReady={() => setNavigationRef(navigationRef)}>
  {/* ... */}
</NavigationContainer>;
```

### Custom Actions

```tsx
import { registerAction } from 'react-native-prod-debugger';

registerAction({
  id: 'clear-cache',
  name: 'Clear Cache',
  icon: '🗑️',
  group: 'Storage',
  handler: async () => {
    await AsyncStorage.clear();
  },
});

registerAction({
  id: 'force-logout',
  name: 'Force Logout',
  icon: '🚪',
  destructive: true,
  group: 'Auth',
  handler: () => {
    store.dispatch(logout());
  },
});
```

### Timeline Events

```tsx
import { logTimelineEvent } from 'react-native-prod-debugger';

// Log navigation events
logTimelineEvent('navigation', 'Navigated to Profile', { userId: 123 });

// Log state changes
logTimelineEvent('state', 'User logged in', { email: 'user@example.com' });

// Log custom events
logTimelineEvent('custom', 'Purchase completed', { amount: 99.99 });
```

---

## 🎨 Programmatic Control

```tsx
import { useDebugger } from 'react-native-prod-debugger';

function SettingsScreen() {
  const { show, hide, toggle, isVisible } = useDebugger();

  return <Button title="Open Debug Panel" onPress={show} />;
}
```

---

## 🧩 Custom Plugins

Create your own plugins and register them:

```tsx
import { registerPlugin } from 'react-native-prod-debugger';

registerPlugin({
  id: 'my-custom-plugin',
  name: 'My Tool',
  icon: '🔧',
  order: 200,
  component: ({ theme }) => (
    <View style={{ padding: 16 }}>
      <Text style={{ color: theme.text }}>Hello from my plugin!</Text>
    </View>
  ),
  onInit: () => console.log('Plugin initialized!'),
  onDestroy: () => console.log('Plugin destroyed!'),
});
```

---

## 📋 Plugin IDs

Use these IDs with `disabledPlugins` to selectively disable tools:

| Plugin               | ID                     |
| -------------------- | ---------------------- |
| Network Inspector    | `network-inspector`    |
| Console Viewer       | `console-viewer`       |
| State Inspector      | `state-inspector`      |
| Feature Flags        | `feature-flags`        |
| Remote Config        | `remote-config`        |
| Storage Browser      | `storage-browser`      |
| Performance Monitor  | `performance-monitor`  |
| Device Info          | `device-info`          |
| Navigation Inspector | `navigation-inspector` |
| Crash Reporter       | `crash-reporter`       |
| Custom Actions       | `custom-actions`       |
| Deep Link Tester     | `deep-link-tester`     |
| Timeline             | `timeline`             |

---

## 📄 License

MIT © [Aman Verma](https://github.com/amanverma)
