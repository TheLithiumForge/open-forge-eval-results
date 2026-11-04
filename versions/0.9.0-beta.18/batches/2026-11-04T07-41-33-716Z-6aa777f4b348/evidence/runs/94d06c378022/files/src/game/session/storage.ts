import { isBoardSize } from '../board.ts';
import { BOARD_SIZES } from '../board.ts';
import type { BoardSize } from '../board.ts';
import { MAX_MOVES } from '../state.ts';

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SIZE_KEY = 'neon-pairs.preferences.v1';
const BEST_KEY = 'neon-pairs.best.v1';

function browserStorage(): StoragePort | null {
  try { return window.localStorage; } catch { return null; }
}

function readJson(storage: StoragePort | null, key: string): unknown {
  if (storage === null) return null;
  try {
    const text = storage.getItem(key);
    if (text === null) return null;
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readPreferredSize(storage: StoragePort | null = browserStorage()): BoardSize | null {
  const value = readJson(storage, SIZE_KEY);
  if (!isRecord(value)) return null;
  const size = value.size;
  return isBoardSize(size) ? size : null;
}

export function writePreferredSize(size: BoardSize, storage: StoragePort | null = browserStorage()): void {
  try { storage?.setItem(SIZE_KEY, JSON.stringify({ size })); } catch { /* Storage is optional. */ }
}

export type BestScores = Partial<Record<BoardSize, number>>;

export function readBestScores(storage: StoragePort | null = browserStorage()): BestScores {
  const value = readJson(storage, BEST_KEY);
  if (!isRecord(value)) return {};
  const scores: BestScores = {};
  for (const size of BOARD_SIZES) {
    const score = value[String(size)];
    if (isBoardSize(size) && typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
      scores[size] = score;
    }
  }
  return scores;
}

export function writeBestScores(scores: BestScores, storage: StoragePort | null = browserStorage()): void {
  try { storage?.setItem(BEST_KEY, JSON.stringify(scores)); } catch { /* Storage is optional. */ }
}

export function storeBest(
  size: BoardSize,
  moves: number,
  current: BestScores,
  storage: StoragePort | null = browserStorage()
): BestScores {
  const scores = { ...current };
  if (!Number.isSafeInteger(moves) || moves < 0 || moves > MAX_MOVES) return scores;
  const previous = scores[size];
  if (previous !== undefined && previous <= moves) return scores;
  scores[size] = moves;
  writeBestScores(scores, storage);
  return scores;
}
