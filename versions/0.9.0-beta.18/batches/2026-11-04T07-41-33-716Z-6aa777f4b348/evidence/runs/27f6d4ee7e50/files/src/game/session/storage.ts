import { BOARD_SIZES, isBoardSize } from "../boardCode.ts";
import type { BoardSize } from "../boardCode.ts";
import { MAX_MOVES } from "../state.ts";

export const PREFERENCES_KEY = "neon-pairs.preferences.v1";

export interface Preferences {
  readonly size: BoardSize;
  readonly bestMoves: Readonly<Partial<Record<BoardSize, number>>>;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_PREFERENCES: Preferences = Object.freeze({ size: 4, bestMoves: Object.freeze({}) });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBestScore(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MOVES;
}

function browserStorage(): StoragePort {
  return window.localStorage;
}

export function readPreferences(
  storageFactory: () => StoragePort = browserStorage,
): Preferences {
  try {
    const text = storageFactory().getItem(PREFERENCES_KEY);
    if (text === null) return DEFAULT_PREFERENCES;
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || value.version !== 1) return DEFAULT_PREFERENCES;

    const size = isBoardSize(value.size) ? value.size : DEFAULT_PREFERENCES.size;
    const bestMoves: Partial<Record<BoardSize, number>> = {};
    if (isRecord(value.bestMoves)) {
      for (const boardSize of BOARD_SIZES) {
        const score = value.bestMoves[boardSize];
        if (isBestScore(score)) bestMoves[boardSize] = score;
      }
    }
    return { size, bestMoves: Object.freeze(bestMoves) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(
  preferences: Preferences,
  storageFactory: () => StoragePort = browserStorage,
): void {
  try {
    storageFactory().setItem(PREFERENCES_KEY, JSON.stringify({
      version: 1,
      size: preferences.size,
      bestMoves: preferences.bestMoves,
    }));
  } catch {
    // Storage is optional; the current game remains usable in memory.
  }
}
