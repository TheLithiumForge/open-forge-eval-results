import { GRID_SIZES, isGridSize, type GridSize } from '../board.ts';
import { MAX_MOVES } from '../state.ts';

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PREFERENCE_KEY = 'neon-pairs.preferences.v1';
const BEST_KEY = 'neon-pairs.best.v1';

export function readSavedSize(storage: StoragePort | null = browserStorage()): GridSize | null {
  try {
    if (storage === null) return null;
    const raw = storage.getItem(PREFERENCE_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return isRecord(value) && isGridSize(value.gridSize) ? value.gridSize : null;
  } catch {
    return null;
  }
}

export function saveSize(size: GridSize, storage: StoragePort | null = browserStorage()): void {
  try {
    storage?.setItem(PREFERENCE_KEY, JSON.stringify({ gridSize: size }));
  } catch {
    return;
  }
}

export function readBestScores(storage: StoragePort | null = browserStorage()): ReadonlyMap<GridSize, number> {
  const scores = new Map<GridSize, number>();
  try {
    if (storage === null) return scores;
    const raw = storage.getItem(BEST_KEY);
    if (raw === null) return scores;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return scores;
    for (const size of GRID_SIZES) {
      const score = value[String(size)];
      if (Number.isSafeInteger(score) && typeof score === 'number' && score >= 0 && score <= MAX_MOVES) {
        scores.set(size, score);
      }
    }
  } catch {
    return new Map();
  }
  return scores;
}

export function saveBestScore(size: GridSize, moves: number, storage: StoragePort | null = browserStorage()): void {
  if (!Number.isSafeInteger(moves) || moves < 0 || moves > MAX_MOVES) return;
  try {
    if (storage === null) return;
    const scores = new Map(readBestScores(storage));
    const current = scores.get(size);
    if (current !== undefined && current <= moves) return;
    scores.set(size, moves);
    storage.setItem(BEST_KEY, JSON.stringify(Object.fromEntries(scores)));
  } catch {
    return;
  }
}

function browserStorage(): StoragePort | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
