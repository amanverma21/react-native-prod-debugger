import type { CustomAction } from '../../core/types';

type ActionListener = (actions: CustomAction[]) => void;

class ActionStoreClass {
  private actions: Map<string, CustomAction> = new Map();
  private listeners: Set<ActionListener> = new Set();

  register(action: CustomAction): void {
    this.actions.set(action.id, action);
    this.notify();
  }

  remove(id: string): void {
    this.actions.delete(id);
    this.notify();
  }

  getAll(): CustomAction[] {
    return Array.from(this.actions.values());
  }

  subscribe(listener: ActionListener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getAll();
    for (const l of this.listeners) {
      try {
        l(snapshot);
      } catch {
        /* ignore */
      }
    }
  }
}

export const actionStore = new ActionStoreClass();

export function registerAction(action: CustomAction): void {
  actionStore.register(action);
}

export function removeAction(id: string): void {
  actionStore.remove(id);
}
