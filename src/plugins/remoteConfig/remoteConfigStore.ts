import type { RemoteConfigProvider } from '../../core/types';

type Listener = () => void;

class RemoteConfigStoreClass {
  private provider: RemoteConfigProvider | null = null;
  private listeners: Set<Listener> = new Set();

  /** Set the remote config provider. */
  set(provider: RemoteConfigProvider): void {
    this.provider = provider;
    this.notify();
  }

  /** Get the current provider. */
  get(): RemoteConfigProvider | null {
    return this.provider;
  }

  /** Remove the provider. */
  remove(): void {
    this.provider = null;
    this.notify();
  }

  /** Subscribe to provider changes. */
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

export const remoteConfigStore = new RemoteConfigStoreClass();

/** Set the remote config provider (e.g., Firebase). */
export function setRemoteConfigProvider(provider: RemoteConfigProvider): void {
  remoteConfigStore.set(provider);
}
