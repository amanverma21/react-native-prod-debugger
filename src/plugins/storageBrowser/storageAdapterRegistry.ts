import type { StorageAdapter } from '../../core/types';

type Listener = () => void;

class StorageAdapterRegistryClass {
  private adapters: Map<string, StorageAdapter> = new Map();
  private listeners: Set<Listener> = new Set();

  set(id: string, adapter: StorageAdapter): void {
    this.adapters.set(id, adapter);
    this.notify();
  }

  remove(id: string): void {
    this.adapters.delete(id);
    this.notify();
  }

  getAll(): Map<string, StorageAdapter> {
    return new Map(this.adapters);
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

export const storageAdapterRegistry = new StorageAdapterRegistryClass();

export function setStorageAdapter(id: string, adapter: StorageAdapter): void {
  storageAdapterRegistry.set(id, adapter);
}

export function removeStorageAdapter(id: string): void {
  storageAdapterRegistry.remove(id);
}
