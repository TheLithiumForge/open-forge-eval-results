import { isSize } from '../deal.ts';
import type { Size } from '../deal.ts';
import { isNatural, isRecord } from '../json.ts';
import { moveCap } from '../turn.ts';

export const preferencesKey = 'neon-pairs.preferences.v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface Preferences { size: Size; best: Partial<Record<Size, number>> }

export function browserStorage(): StoragePort | null {
  try { return window.localStorage; } catch { return null; }
}

export function readPreferences(storage: StoragePort | null): Preferences {
  const defaults: Preferences = { size: 4, best: {} };
  try {
    const value: unknown = JSON.parse(storage?.getItem(preferencesKey) ?? 'null');
    if (!isRecord(value)) return defaults;
    const best: Partial<Record<Size, number>> = {};
    if (isRecord(value.best)) {
      for (const [key, score] of Object.entries(value.best)) {
        const size = Number(key);
        if (isSize(size) && String(size) === key && isNatural(score) && score <= moveCap) best[size] = score;
      }
    }
    return { size: isSize(value.size) ? value.size : 4, best };
  } catch { return defaults; }
}

export function writePreferences(storage: StoragePort | null, value: Preferences): void {
  try { storage?.setItem(preferencesKey, JSON.stringify(value)); } catch { /* Play stays available. */ }
}
