import type { DebuggerPlugin } from './types';

/**
 * PluginRegistry — Central registry for all debugger plugins.
 *
 * Plugins are stored in a static array and sorted by their `order` property.
 * Built-in plugins are registered automatically by DebuggerProvider.
 * Custom plugins can be registered by consumers at any time.
 */
class PluginRegistryClass {
  private plugins: Map<string, DebuggerPlugin> = new Map();
  private listeners: Set<() => void> = new Set();

  /** Register a plugin. Replaces existing plugin with the same ID. */
  register(plugin: DebuggerPlugin): void {
    this.plugins.set(plugin.id, {
      ...plugin,
      order: plugin.order ?? 100,
    });
    this.notify();
  }

  /** Register multiple plugins at once. Triggers a single notification. */
  registerBatch(plugins: DebuggerPlugin[]): void {
    for (const plugin of plugins) {
      this.plugins.set(plugin.id, {
        ...plugin,
        order: plugin.order ?? 100,
      });
    }
    this.notify();
  }

  /** Unregister a plugin by ID. */
  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin?.onDestroy) {
      try {
        plugin.onDestroy();
      } catch {
        // Silently handle cleanup errors
      }
    }
    this.plugins.delete(id);
    this.notify();
  }

  /** Get all registered plugins, sorted by order. */
  getAll(): DebuggerPlugin[] {
    return Array.from(this.plugins.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /** Get a plugin by ID. */
  get(id: string): DebuggerPlugin | undefined {
    return this.plugins.get(id);
  }

  /** Check if a plugin is registered. */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /** Get the count of registered plugins. */
  get count(): number {
    return this.plugins.size;
  }

  /** Subscribe to registry changes. Returns unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Initialize all plugins (called by DebuggerProvider on mount). */
  initAll(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onInit) {
        try {
          plugin.onInit();
        } catch (error) {
          console.warn(`[ProdDebugger] Plugin "${plugin.id}" init failed:`, error);
        }
      }
    }
  }

  /** Destroy all plugins (called by DebuggerProvider on unmount). */
  destroyAll(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onDestroy) {
        try {
          plugin.onDestroy();
        } catch {
          // Silently handle cleanup errors
        }
      }
    }
    this.plugins.clear();
  }

  /** Clear all plugins from the registry. */
  clear(): void {
    this.destroyAll();
    this.plugins.clear();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Silently handle listener errors
      }
    }
  }
}

/** Singleton plugin registry instance. */
export const PluginRegistry = new PluginRegistryClass();

/** Register a custom plugin. Convenience function. */
export function registerPlugin(plugin: DebuggerPlugin): void {
  PluginRegistry.register(plugin);
}

/** Unregister a plugin by ID. Convenience function. */
export function unregisterPlugin(id: string): void {
  PluginRegistry.unregister(id);
}
