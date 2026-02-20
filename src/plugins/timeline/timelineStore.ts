import type { TimelineEvent } from '../../core/types';
import { generateId } from '../../core/utils';

type TimelineListener = (events: TimelineEvent[]) => void;

/**
 * TimelineStore — Global event logger for tracking app lifecycle events.
 *
 * Records events with category, timestamp, and optional data.
 * Useful for tracking user flows, state transitions, and debugging sequences.
 */
class TimelineStoreClass {
  private events: TimelineEvent[] = [];
  private listeners: Set<TimelineListener> = new Set();
  private maxEvents = 500;

  /** Log a timeline event. */
  log(category: TimelineEvent['category'], title: string, data?: unknown): void {
    const event: TimelineEvent = {
      id: generateId(),
      timestamp: Date.now(),
      category,
      title,
      data,
    };
    this.events = [event, ...this.events].slice(0, this.maxEvents);
    this.notify();
  }

  getAll(): TimelineEvent[] {
    return [...this.events];
  }
  clear(): void {
    this.events = [];
    this.notify();
  }

  subscribe(listener: TimelineListener): () => void {
    this.listeners.add(listener);
    listener(this.events);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.events;
    for (const l of this.listeners) {
      try {
        l(snapshot);
      } catch {
        /* ignore */
      }
    }
  }
}

export const timelineStore = new TimelineStoreClass();

/** Log a timeline event. */
export function logTimelineEvent(
  category: TimelineEvent['category'],
  title: string,
  data?: unknown,
): void {
  timelineStore.log(category, title, data);
}
