import { isGridSize, type GridSize } from '../board/sizes.ts';
import { MOVE_LIMIT } from '../types.ts';

const SIZE_KEY = 'neon-pairs.preference.v1';
const BEST_KEY = 'neon-pairs.best.v1';
export type BestScores = Partial<Record<GridSize, number>>;

function parseStored(text: string | null): unknown {
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readPreferredSize(): GridSize {
  try {
    const value = parseStored(window.localStorage.getItem(SIZE_KEY));
    if (isRecord(value) && isGridSize(value.size)) return value.size;
  } catch { return 4; }
  return 4;
}

export function savePreferredSize(size: GridSize): void {
  try { window.localStorage.setItem(SIZE_KEY, JSON.stringify({ size })); } catch { /* Play remains available. */ }
}

export function readBestScores(): BestScores {
  try {
    const value = parseStored(window.localStorage.getItem(BEST_KEY));
    if (!isRecord(value)) return {};
    const scores: BestScores = {};
    for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (isGridSize(size) && typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MOVE_LIMIT) {
        scores[size] = score;
      }
    }
    return scores;
  } catch { return {}; }
}

export function saveBestScores(scores: BestScores): void {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(scores)); } catch { /* Play remains available. */ }
}
