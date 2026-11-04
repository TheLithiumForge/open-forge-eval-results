import type { SessionEnvironment } from './environment.ts';
import type { StorageAccess } from './storage.ts';

interface FakeTimer {
  readonly callback: () => void;
  readonly interval: number | null;
  readonly dueAt: number;
}

export class MemoryStorage implements StorageAccess {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

export class FakeBrowser implements SessionEnvironment {
  private time = 0;
  private nextId = 1;
  private readonly timers = new Map<number, FakeTimer>();
  private readonly canceledCallbacks: Array<() => void> = [];
  private readonly visibilityListeners = new Set<() => void>();
  private shown = true;
  readonly storage = new MemoryStorage();

  now(): number { return this.time; }
  isVisible(): boolean { return this.shown; }
  randomSeed(): number { return 1; }

  setInterval(callback: () => void, milliseconds: number): () => void {
    return this.addTimer(callback, milliseconds, milliseconds);
  }

  setTimeout(callback: () => void, milliseconds: number): () => void {
    return this.addTimer(callback, milliseconds, null);
  }

  private addTimer(callback: () => void, delay: number, interval: number | null): () => void {
    const id = this.nextId;
    this.nextId += 1;
    this.timers.set(id, { callback, interval, dueAt: this.time + delay });
    return () => {
      const timer = this.timers.get(id);
      if (timer !== undefined) this.canceledCallbacks.push(timer.callback);
      this.timers.delete(id);
    };
  }

  onVisibilityChange(callback: () => void): () => void {
    this.visibilityListeners.add(callback);
    return () => this.visibilityListeners.delete(callback);
  }

  setVisible(shown: boolean): void {
    this.shown = shown;
    for (const callback of this.visibilityListeners) callback();
  }

  advanceBy(milliseconds: number): void {
    const target = this.time + milliseconds;
    while (true) {
      let nextId: number | null = null;
      let nextTimer: FakeTimer | null = null;
      for (const [id, timer] of this.timers) {
        if (timer.dueAt <= target && (nextTimer === null || timer.dueAt < nextTimer.dueAt)) {
          nextId = id;
          nextTimer = timer;
        }
      }
      if (nextId === null || nextTimer === null) break;
      this.time = nextTimer.dueAt;
      if (nextTimer.interval === null) this.timers.delete(nextId);
      else this.timers.set(nextId, { ...nextTimer, dueAt: nextTimer.dueAt + nextTimer.interval });
      nextTimer.callback();
    }
    this.time = target;
  }

  moveTimeWithoutRunningTimers(milliseconds: number): void { this.time += milliseconds; }

  invokeCanceledCallbacks(): void {
    for (const callback of this.canceledCallbacks.splice(0)) callback();
  }
}
