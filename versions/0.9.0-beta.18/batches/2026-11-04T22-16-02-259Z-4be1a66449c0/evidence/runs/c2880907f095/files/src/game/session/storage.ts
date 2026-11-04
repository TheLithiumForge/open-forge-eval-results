import { GRID_SIZES, MAX_MOVES } from '../constants';
import type { GridSize } from '../types';

const SIZE_KEY = 'neon-pairs.preferences.v1';
const BEST_KEY = 'neon-pairs.best.v1';

export function readSavedSize(): GridSize | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SIZE_KEY) ?? 'null');
    if (!isRecord(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'size') || !isGridSize(value.size)) return null;
    return value.size;
  } catch { return null; }
}

export function saveSize(size: GridSize): void {
  try { window.localStorage.setItem(SIZE_KEY, JSON.stringify({ size })); } catch { /* Storage is optional. */ }
}

export function readBestScores(): Map<GridSize, number> {
  const scores = new Map<GridSize, number>();
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? 'null');
    if (!isRecord(value)) return scores;
    for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (String(size) === key && isGridSize(size) && typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
        scores.set(size, score);
      }
    }
  } catch { /* A corrupt record is ignored. */ }
  return scores;
}

export function saveBestScores(scores: ReadonlyMap<GridSize, number>): void {
  const value: Record<string, number> = {};
  for (const [size, moves] of scores) value[String(size)] = moves;
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}

function isGridSize(value: unknown): value is GridSize {
  return typeof value === 'number' && GRID_SIZES.some((size) => size === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
