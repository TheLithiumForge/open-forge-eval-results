import { MAX_SEED } from '../boardCode.ts';
import type { ClockPorts } from './model.ts';

export function freshSeed(previous?: number): number {
  const words = new Uint32Array(1);
  let random: number;
  try { random = (globalThis.crypto.getRandomValues(words)[0] ?? 0) % MAX_SEED + 1; }
  catch { random = Math.floor(Math.random() * MAX_SEED) + 1; }
  return random === previous ? random % MAX_SEED + 1 : random;
}

export const browserClock: ClockPorts = {
  now: () => performance.now(),
  isHidden: () => document.hidden,
  schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
  },
  watchVisibility(callback) {
    document.addEventListener('visibilitychange', callback);
    return () => document.removeEventListener('visibilitychange', callback);
  },
};
