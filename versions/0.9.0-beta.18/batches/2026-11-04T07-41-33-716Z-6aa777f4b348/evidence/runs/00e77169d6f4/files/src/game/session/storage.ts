import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { MAX_MOVES } from '../state.ts';
import { isInteger, isRecord } from '../snapshotValidation.ts';

export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export const BEST_KEY = 'neon-pairs.best.v1';
export type BestScores = Partial<Record<Size, number>>;

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session remains playable. */ }
}
export function readSize(): Size {
  const value = read(PREFERENCES_KEY);
  return isRecord(value) && isSize(value.size) ? value.size : 4;
}
export function saveSize(size: Size): void { write(PREFERENCES_KEY, { size }); }
export function readBests(): BestScores {
  const value = read(BEST_KEY);
  const best: BestScores = {};
  if (isRecord(value)) for (const size of SIZES) {
    const score = value[String(size)];
    if (isInteger(score, MAX_MOVES)) best[size] = score;
  }
  return best;
}
export function saveBest(best: BestScores, size: Size, moves: number): BestScores {
  if (best[size] !== undefined && moves >= best[size]) return best;
  const next = { ...best, [size]: moves };
  write(BEST_KEY, next);
  return next;
}
