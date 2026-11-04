import { BOARD_SIZES, isBoardSize, type BoardSize } from "../board/sizes.ts";
import { MAX_MOVES } from "../transition.ts";

export const PREFERENCES_KEY = "neon-pairs.preferences.v1";

export interface StoredPreferences {
  readonly size: BoardSize;
  readonly bestMoves: Partial<Record<BoardSize, number>>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function emptyPreferences(): StoredPreferences {
  return { size: 4, bestMoves: {} };
}

export function readPreferences(storage: StorageLike | undefined): StoredPreferences {
  if (storage === undefined) return emptyPreferences();

  try {
    const source = storage.getItem(PREFERENCES_KEY);
    if (source === null) return emptyPreferences();

    const value: unknown = JSON.parse(source);
    if (!isRecord(value)) return emptyPreferences();

    const size = isBoardSize(value.size) ? value.size : 4;
    const bestMoves: Partial<Record<BoardSize, number>> = {};
    if (isRecord(value.bestMoves)) {
      for (const boardSize of BOARD_SIZES) {
        const score = value.bestMoves[String(boardSize)];
        if (
          typeof score === "number" &&
          Number.isFinite(score) &&
          Number.isInteger(score) &&
          score >= 0 &&
          score <= MAX_MOVES
        ) {
          bestMoves[boardSize] = score;
        }
      }
    }

    return { size, bestMoves };
  } catch {
    return emptyPreferences();
  }
}

export function writePreferences(
  storage: StorageLike | undefined,
  preferences: StoredPreferences,
): void {
  if (storage === undefined) return;
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is an optional convenience; in-memory play remains available.
  }
}

export class PreferenceStore {
  private readonly storage: StorageLike | undefined;
  private value: StoredPreferences;

  public constructor(storage?: StorageLike | null) {
    this.storage = storage ?? undefined;
    this.value = this.storage === undefined
      ? emptyPreferences()
      : readPreferences(this.storage);
  }

  public bestFor(size: BoardSize): number | null {
    return this.value.bestMoves[size] ?? null;
  }

  public get size(): BoardSize {
    return this.value.size;
  }

  public rememberSize(size: BoardSize): void {
    this.value = { ...this.value, size };
    writePreferences(this.storage, this.value);
  }

  public recordWin(size: BoardSize, moves: number): void {
    const existing = this.value.bestMoves[size];
    if (existing !== undefined && existing <= moves) return;
    const bestMoves = { ...this.value.bestMoves, [size]: moves };
    this.value = { ...this.value, bestMoves };
    writePreferences(this.storage, this.value);
  }
}
