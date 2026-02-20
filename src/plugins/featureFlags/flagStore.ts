import type { FeatureFlag } from '../../core/types';

type FlagListener = (flags: FeatureFlag[]) => void;

/**
 * Feature Flag Store — In-memory registry for feature flags.
 *
 * Flags can be registered by the consumer app and toggled at runtime
 * via the debugger overlay. Overrides persist in-memory (optionally in AsyncStorage).
 */
class FlagStoreClass {
  private flags: Map<string, FeatureFlag> = new Map();
  private listeners: Set<FlagListener> = new Set();
  private changeCallbacks: Map<string, (value: FeatureFlag['currentValue']) => void> = new Map();

  /** Register a feature flag. */
  register(
    flag: Omit<FeatureFlag, 'currentValue'> & { currentValue?: FeatureFlag['currentValue'] },
  ): void {
    const existing = this.flags.get(flag.key);
    this.flags.set(flag.key, {
      ...flag,
      currentValue: existing?.currentValue ?? flag.currentValue ?? flag.defaultValue,
    });
    this.notify();
  }

  /** Get a flag value. Returns the overridden value if set, otherwise the default. */
  get(key: string): FeatureFlag['currentValue'] | undefined {
    return this.flags.get(key)?.currentValue;
  }

  /** Get a flag definition. */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /** Get all flags. */
  getAll(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /** Override a flag value. */
  override(key: string, value: FeatureFlag['currentValue']): void {
    const flag = this.flags.get(key);
    if (!flag) return;
    this.flags.set(key, { ...flag, currentValue: value });
    // Fire change callback
    const cb = this.changeCallbacks.get(key);
    if (cb) cb(value);
    this.notify();
  }

  /** Reset a single flag to its default value. */
  reset(key: string): void {
    const flag = this.flags.get(key);
    if (!flag) return;
    this.flags.set(key, { ...flag, currentValue: flag.defaultValue });
    const cb = this.changeCallbacks.get(key);
    if (cb) cb(flag.defaultValue);
    this.notify();
  }

  /** Reset all flags to defaults. */
  resetAll(): void {
    for (const [key, flag] of this.flags) {
      this.flags.set(key, { ...flag, currentValue: flag.defaultValue });
      const cb = this.changeCallbacks.get(key);
      if (cb) cb(flag.defaultValue);
    }
    this.notify();
  }

  /** Register a callback when a specific flag changes. */
  onChange(key: string, callback: (value: FeatureFlag['currentValue']) => void): () => void {
    this.changeCallbacks.set(key, callback);
    return () => this.changeCallbacks.delete(key);
  }

  /** Subscribe to all flag changes. */
  subscribe(listener: FlagListener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getAll();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        /* ignore */
      }
    }
  }
}

const flagStore = new FlagStoreClass();

/** Register a feature flag. */
export function registerFlag(
  flag: Omit<FeatureFlag, 'currentValue'> & { currentValue?: FeatureFlag['currentValue'] },
): void {
  flagStore.register(flag);
}

/** Reset all flag overrides. */
export function resetFlags(): void {
  flagStore.resetAll();
}

/** Get a flag's current value. */
export function getFlag(key: string): FeatureFlag['currentValue'] | undefined {
  return flagStore.get(key);
}

export { flagStore };
