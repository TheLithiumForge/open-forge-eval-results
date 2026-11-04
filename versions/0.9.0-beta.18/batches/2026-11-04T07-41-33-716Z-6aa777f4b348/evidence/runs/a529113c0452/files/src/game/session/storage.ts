import { GRID_SIZES, isGridSize } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import { MAX_MOVES } from '../state.ts';
import { isInteger } from '../validation.ts';

export type SessionStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type BestScores = Readonly<Partial<Record<GridSize, number>>>;
export const SIZE_KEY = 'neon-pairs.size';
export const bestKey = (size: GridSize): string => `neon-pairs.best.${size}`;

export function browserStorage(): SessionStorage | null {
  try { return window.localStorage; } catch { return null; }
}

function read(storage: SessionStorage | null, key: string): unknown {
  try {
    const text = storage?.getItem(key);
    const value: unknown = text == null ? null : JSON.parse(text);
    return value;
  } catch { return null; }
}

export function readPreferences(storage: SessionStorage | null): Readonly<{ size: GridSize; bests: BestScores }> {
  const savedSize = read(storage, SIZE_KEY);
  const bests: Partial<Record<GridSize, number>> = {};
  for (const size of GRID_SIZES) {
    const score = read(storage, bestKey(size));
    if (isInteger(score, MAX_MOVES)) bests[size] = score;
  }
  return { size: isGridSize(savedSize) ? savedSize : 4, bests };
}

function write(storage: SessionStorage | null, key: string, value: number): void {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* Play continues in memory. */ }
}

export function saveSize(storage: SessionStorage | null, size: GridSize): void {
  write(storage, SIZE_KEY, size);
}

export function saveBest(storage: SessionStorage | null, size: GridSize, moves: number): void {
  write(storage, bestKey(size), moves);
}
