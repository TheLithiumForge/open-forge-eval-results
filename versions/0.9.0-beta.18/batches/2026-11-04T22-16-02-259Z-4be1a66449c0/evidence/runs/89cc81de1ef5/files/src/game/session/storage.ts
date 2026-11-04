import { isBoardSize, MOVE_CAP, SIZES, type BoardSize } from '../constants.ts';

const SIZE_KEY = 'neon-pairs.preferences.v1';
const BEST_KEY = 'neon-pairs.best.v1';
export type BestScores = Partial<Record<BoardSize, number>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readGridSize(): BoardSize {
  try {
    const text = window.localStorage.getItem(SIZE_KEY);
    if (text === null) return 4;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !isBoardSize(value.size)) return 4;
    return value.size;
  } catch {
    return 4;
  }
}

export function saveGridSize(size: BoardSize): void {
  try { window.localStorage.setItem(SIZE_KEY, JSON.stringify({ size })); } catch { /* Storage is optional. */ }
}

export function readBestScores(): BestScores {
  try {
    const text = window.localStorage.getItem(BEST_KEY);
    if (text === null) return {};
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return {};
    const scores: BestScores = {};
    for (const size of SIZES) {
      const score: unknown = value[String(size)];
      if (typeof score === 'number' && Number.isFinite(score) && Number.isInteger(score) && score >= 0 && score <= MOVE_CAP) {
        scores[size] = score;
      }
    }
    return scores;
  } catch {
    return {};
  }
}

export function saveBestScores(scores: BestScores): void {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(scores)); } catch { /* Storage is optional. */ }
}
