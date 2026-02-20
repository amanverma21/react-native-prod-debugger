import type { ConsoleEntry, ConsoleLevel } from '../../core/types';
import { generateId, safeStringify } from '../../core/utils';

type ConsoleListener = (entries: ConsoleEntry[]) => void;

/**
 * ConsoleInterceptor — Captures console.log/warn/error/info/debug calls.
 *
 * Wraps the global console methods and stores entries in a ring buffer.
 * Original console behavior is preserved — messages still appear in the developer console.
 */
class ConsoleInterceptorClass {
  private entries: ConsoleEntry[] = [];
  private listeners: Set<ConsoleListener> = new Set();
  private maxEntries: number = 1000;
  private isActive: boolean = false;

  private originals: Record<ConsoleLevel, (...args: unknown[]) => void> = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  /** Start intercepting console calls. */
  start(maxEntries: number = 1000): void {
    if (this.isActive) return;
    this.maxEntries = maxEntries;
    this.isActive = true;

    const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
    for (const level of levels) {
      this.originals[level] = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        // Preserve original behavior
        this.originals[level](...args);
        // Capture entry
        this.addEntry(level, args);
      };
    }
  }

  /** Stop intercepting and restore original console. */
  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;

    const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
    for (const level of levels) {
      console[level] = this.originals[level];
    }
  }

  /** Subscribe to entry changes. Returns unsubscribe function. */
  subscribe(listener: ConsoleListener): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => this.listeners.delete(listener);
  }

  /** Get all entries. */
  getAll(): ConsoleEntry[] {
    return [...this.entries];
  }

  /** Clear all entries. */
  clear(): void {
    this.entries = [];
    this.notify();
  }

  get active(): boolean {
    return this.isActive;
  }

  private addEntry(level: ConsoleLevel, args: unknown[]): void {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        return safeStringify(arg);
      })
      .join(' ');

    const entry: ConsoleEntry = {
      id: generateId(),
      level,
      timestamp: Date.now(),
      message,
      args,
    };

    this.entries = [entry, ...this.entries].slice(0, this.maxEntries);
    this.notify();
  }

  private notify(): void {
    const snapshot = this.entries;
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Silently handle errors
      }
    }
  }
}

/** Singleton console interceptor instance. */
export const ConsoleInterceptor = new ConsoleInterceptorClass();
