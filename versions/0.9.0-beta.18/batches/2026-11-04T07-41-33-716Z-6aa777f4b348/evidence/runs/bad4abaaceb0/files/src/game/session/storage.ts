import { GRID_SIZES, MAX_MOVES, type GridSize } from "../constants.ts";
import { isGridSize } from "../boardCode.ts";

const STORAGE_KEY = "neon-pairs.preferences.v1";

type Preferences = Readonly<{
  size: GridSize;
  bests: Readonly<Partial<Record<GridSize, number>>>;
}>;

const DEFAULTS: Preferences = { size: 4, bests: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? "null");
    if (!isRecord(value) || !isGridSize(value.size) || !isRecord(value.bests)) return DEFAULTS;
    const bests: Partial<Record<GridSize, number>> = {};
    for (const size of GRID_SIZES) {
      const score: unknown = value.bests[String(size)];
      if (typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
        bests[size] = score;
      }
    }
    return { size: value.size, bests };
  } catch {
    return DEFAULTS;
  }
}

function writePreferences(preferences: Preferences): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage is optional; the current game remains in memory.
  }
}

export function saveSize(size: GridSize): void {
  writePreferences({ ...readPreferences(), size });
}

export function saveBest(size: GridSize, moves: number): Preferences {
  const current = readPreferences();
  const previous = current.bests[size];
  const bests = previous === undefined || moves < previous
    ? { ...current.bests, [size]: moves }
    : current.bests;
  const updated = { ...current, bests };
  writePreferences(updated);
  return updated;
}
