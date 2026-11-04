import { MAX_SEED } from '../boardCode.ts';
import type { StoragePort } from './storage.ts';

export function browserStorage(): StoragePort | null {
  try { return window.localStorage; } catch { return null; }
}

export function freshSeed(previous: number): number {
  const candidate = Math.floor(Math.random() * MAX_SEED) + 1;
  return candidate === previous ? (candidate % MAX_SEED) + 1 : candidate;
}
