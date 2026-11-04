import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import type { StoragePort } from './storage.ts';

export function browserStorage(): StoragePort | null {
  try { return window.localStorage; } catch { return null; }
}

export function freshCode(size: Size, previousCode?: string): string {
  let seed: number;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    seed = ((values[0] ?? 0) % MAX_SEED) + 1;
  } catch { seed = Math.floor(Math.random() * MAX_SEED) + 1; }
  if (`np1-${size}-${seed}` === previousCode) seed = seed === MAX_SEED ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}
