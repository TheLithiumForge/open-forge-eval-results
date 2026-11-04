import { createSession } from './controller.ts';
import type { SessionPorts } from './controller.ts';
import type { Preferences } from './storage.ts';

export function sessionFixture(preferences: Preferences = { size: 4, best: {} }) {
  let now = 0;
  let hidden = false;
  let visibility: (() => void) | null = null;
  const pending = new Set<{ callback: () => void; delay: number }>();
  const callbacks: (() => void)[] = [];
  const saved: Preferences[] = [];
  const ports: SessionPorts = {
    now: () => now,
    isHidden: () => hidden,
    seed: (previous) => previous === 1 ? 2 : 1,
    save: (value) => { saved.push(value); },
    schedule(callback, delay) {
      const timer = { callback, delay };
      pending.add(timer);
      callbacks.push(callback);
      return () => { pending.delete(timer); };
    },
    watchVisibility(callback) { visibility = callback; return () => { visibility = null; }; },
  };
  const session = createSession(ports, preferences);
  const disconnect = session.connect(() => {});
  return {
    session, pending, callbacks, saved, disconnect,
    elapse(milliseconds: number): void { now += milliseconds; },
    tick(milliseconds: number): void {
      now += milliseconds;
      const callback = [...pending][0]?.callback;
      callback?.();
    },
    hide(value: boolean): void { hidden = value; visibility?.(); },
  };
}
