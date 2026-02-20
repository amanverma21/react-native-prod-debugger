/**
 * State Adapter Registry — Allows consumers to register their state stores.
 *
 * Supports Redux, Zustand, MobX, or any custom state store via a simple adapter interface.
 */

export interface StateAdapter {
  /** Adapter name (e.g., "Redux", "Zustand - userStore"). */
  name: string;
  /** Get the current state snapshot. */
  getState: () => unknown;
  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe?: (listener: () => void) => () => void;
}

type AdapterListener = () => void;

class StateAdapterRegistryClass {
  private adapters: Map<string, StateAdapter> = new Map();
  private listeners: Set<AdapterListener> = new Set();

  /** Register a state adapter. */
  set(id: string, adapter: StateAdapter): void {
    this.adapters.set(id, adapter);
    this.notify();
  }

  /** Remove a state adapter. */
  remove(id: string): void {
    this.adapters.delete(id);
    this.notify();
  }

  /** Get all registered adapters. */
  getAll(): Map<string, StateAdapter> {
    return new Map(this.adapters);
  }

  /** Subscribe to adapter changes. */
  subscribe(listener: AdapterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* ignore */
      }
    }
  }
}

export const stateAdapterRegistry = new StateAdapterRegistryClass();

/** Register a state store adapter. */
export function setStateAdapter(id: string, adapter: StateAdapter): void {
  stateAdapterRegistry.set(id, adapter);
}

/** Remove a state store adapter. */
export function removeStateAdapter(id: string): void {
  stateAdapterRegistry.remove(id);
}
