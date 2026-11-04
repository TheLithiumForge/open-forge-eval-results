import { isSize, SIZES } from '../deal.ts';
import type { Size } from '../deal.ts';
import { MAX_MOVES } from '../state.ts';
import { integer, isRecord } from '../validation.ts';

const SIZE_KEY = 'neon-pairs.size.v1';
const BEST_KEY = 'neon-pairs.best.v1';
export type BestScores = Partial<Record<Size, number>>;

function read(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    const value: unknown = text === null ? null : JSON.parse(text);
    return value;
  } catch { return null; }
}

function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session play still works. */ }
}

export function readSize(): Size {
  const size = read(SIZE_KEY);
  return isSize(size) ? size : 4;
}

export function saveSize(size: Size): void { write(SIZE_KEY, size); }

export function readBest(): BestScores {
  const data = read(BEST_KEY);
  const best: BestScores = {};
  if (isRecord(data)) {
    for (const size of SIZES) {
      const score = data[String(size)];
      if (integer(score, MAX_MOVES)) best[size] = score;
    }
  }
  return best;
}

export function saveBest(best: BestScores): void { write(BEST_KEY, best); }
