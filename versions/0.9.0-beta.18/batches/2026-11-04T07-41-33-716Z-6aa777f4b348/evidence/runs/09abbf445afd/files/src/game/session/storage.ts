import { BOARD_SIZES, MAX_MOVES, type BoardSize } from '../constants.ts';

export const STORAGE_KEY = 'neon-pairs-preferences-v1';
export type BestScores = Readonly<Partial<Record<BoardSize, number>>>;
export type SessionPreferences = Readonly<{ size: BoardSize; bestScores: BestScores }>;

const DEFAULT_SIZE: BoardSize = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && BOARD_SIZES.some((size) => size === value);
}

export function parsePreferences(text: string | null): SessionPreferences {
  if (text === null) return { size: DEFAULT_SIZE, bestScores: {} };
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return { size: DEFAULT_SIZE, bestScores: {} };
    const size = isBoardSize(value.size) ? value.size : DEFAULT_SIZE;
    const bestScores: Partial<Record<BoardSize, number>> = {};
    if (isRecord(value.bestScores)) {
      for (const boardSize of BOARD_SIZES) {
        const score = value.bestScores[boardSize];
        if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
          bestScores[boardSize] = score;
        }
      }
    }
    return { size, bestScores };
  } catch {
    return { size: DEFAULT_SIZE, bestScores: {} };
  }
}

export function readPreferences(): SessionPreferences {
  try {
    if (typeof window === 'undefined') return { size: DEFAULT_SIZE, bestScores: {} };
    return parsePreferences(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { size: DEFAULT_SIZE, bestScores: {} };
  }
}

export function writePreferences(preferences: SessionPreferences): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  } catch {
    // Storage is optional; a failed write never interrupts play.
  }
}
