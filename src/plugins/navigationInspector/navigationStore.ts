type Listener = () => void;

class NavigationStoreClass {
  private ref: { current: unknown } | null = null;
  private history: { name: string; params?: Record<string, unknown>; timestamp: number }[] = [];
  private listeners: Set<Listener> = new Set();
  private maxHistory = 50;

  setRef(ref: { current: unknown }): void {
    this.ref = ref;
    this.notify();
  }

  getRef(): unknown {
    return this.ref?.current;
  }

  addHistoryEntry(name: string, params?: Record<string, unknown>): void {
    this.history = [{ name, params, timestamp: Date.now() }, ...this.history].slice(
      0,
      this.maxHistory,
    );
    this.notify();
  }

  getHistory() {
    return [...this.history];
  }

  getState(): unknown {
    try {
      const nav = this.ref?.current as { getRootState?: () => unknown } | undefined;
      return nav?.getRootState?.() ?? null;
    } catch {
      return null;
    }
  }

  getCurrentRoute(): { name: string; params?: Record<string, unknown> } | null {
    try {
      const nav = this.ref?.current as
        | { getCurrentRoute?: () => { name: string; params?: Record<string, unknown> } }
        | undefined;
      return nav?.getCurrentRoute?.() ?? null;
    } catch {
      return null;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        /* ignore */
      }
    }
  }
}

export const navigationStore = new NavigationStoreClass();

export function setNavigationRef(ref: { current: unknown }): void {
  navigationStore.setRef(ref);
}
