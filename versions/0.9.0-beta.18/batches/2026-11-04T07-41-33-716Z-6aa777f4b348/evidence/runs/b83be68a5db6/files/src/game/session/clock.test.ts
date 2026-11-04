import { expect, it } from 'vitest';
import { createActiveClock } from './clock.ts';

it('uses monotonic active deltas, pauses, and invalidates callbacks on replacement', () => {
  let now = 0;
  let id = 0;
  let elapsed = 0;
  const pending = new Map<number, () => void>();
  const clock = createActiveClock({ now: () => now,
    request(callback) { pending.set(++id, callback); return id; }, cancel(key) { pending.delete(key); } },
  ms => { elapsed += ms; });
  clock.setRunning(true);
  now = 250;
  clock.flush();
  clock.setRunning(false);
  expect(elapsed).toBe(250);
  now = 10000;
  clock.flush();
  expect(elapsed).toBe(250);
  clock.setRunning(true);
  const stale = pending.get(id);
  now = 10100;
  clock.reset();
  expect(elapsed).toBe(350);
  elapsed = 0;
  clock.setRunning(true);
  now = 10200;
  stale?.();
  expect(elapsed).toBe(0);
  pending.get(id)?.();
  expect(elapsed).toBe(100);
  clock.reset();
  expect(pending.size).toBe(1); // The fake scheduler retains its already-fired callback.
});
