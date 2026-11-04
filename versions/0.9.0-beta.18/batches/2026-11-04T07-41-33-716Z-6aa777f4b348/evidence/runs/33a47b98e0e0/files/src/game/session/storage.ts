import { BOARD_SIZES, isBoardSize } from '../board.ts';

const PREFERENCES_KEY = 'neon-pairs:preferences:v1';
const BEST_SCORES_KEY = 'neon-pairs:best-scores:v1';
const MAX_BEST_MOVES = 999_999;

export interface StorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface GamePreferences {
  readonly size: (typeof BOARD_SIZES)[number];
}

export type BestScores = Readonly<Partial<Record<(typeof BOARD_SIZES)[number], number>>>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readPreferences(storage: StorageAccess | null): GamePreferences | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !isBoardSize(value.size)) return null;
    if (Object.keys(value).length !== 2) return null;
    return Object.freeze({ size: value.size });
  } catch {
    return null;
  }
}

export function writePreferences(storage: StorageAccess | null, size: number): void {
  if (storage === null || !isBoardSize(size)) return;
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, size }));
  } catch {
    // Storage is optional; the current session remains playable.
  }
}

export function readBestScores(storage: StorageAccess | null): BestScores {
  if (storage === null) return Object.freeze({});
  try {
    const raw = storage.getItem(BEST_SCORES_KEY);
    if (raw === null) return Object.freeze({});
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !record(value.scores)) return Object.freeze({});
    const scores: Partial<Record<(typeof BOARD_SIZES)[number], number>> = {};
    for (const size of BOARD_SIZES) {
      const score = value.scores[String(size)];
      if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_BEST_MOVES) {
        scores[size] = score;
      }
    }
    return Object.freeze(scores);
  } catch {
    return Object.freeze({});
  }
}

export function writeBestScores(storage: StorageAccess | null, scores: BestScores): void {
  if (storage === null) return;
  const safeScores: Partial<Record<(typeof BOARD_SIZES)[number], number>> = {};
  for (const size of BOARD_SIZES) {
    const score = scores[size];
    if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_BEST_MOVES) {
      safeScores[size] = score;
    }
  }
  try {
    storage.setItem(BEST_SCORES_KEY, JSON.stringify({ version: 1, scores: safeScores }));
  } catch {
    // Storage is optional; the current session remains playable.
  }
}

