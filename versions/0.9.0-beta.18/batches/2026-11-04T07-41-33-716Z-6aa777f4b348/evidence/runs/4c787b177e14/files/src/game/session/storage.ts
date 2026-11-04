import { MAX_MOVES } from "../constants.ts";
import { SUPPORTED_SIZES } from "../board.ts";
import type { GridSize } from "../types.ts";

const GRID_KEY = "neon-pairs.grid-size.v1";
const BEST_KEY = "neon-pairs.best-moves.v1";

export type BestScores = Readonly<Partial<Record<GridSize, number>>>;
export type SavedPreferences = Readonly<{ gridSize: GridSize; bestScores: BestScores }>;

function isGridSize(value: unknown): value is GridSize {
  return typeof value === "number" && SUPPORTED_SIZES.some((size) => value === size);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBestScores(value: unknown): BestScores {
  if (!isRecord(value)) return {};
  const scores: Partial<Record<GridSize, number>> = {};
  for (const size of SUPPORTED_SIZES) {
    const score = value[String(size)];
    if (typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= MAX_MOVES) {
      scores[size] = score;
    }
  }
  return scores;
}

export function readPreferences(): SavedPreferences {
  let gridSize: GridSize = 4;
  let bestScores: BestScores = {};
  try {
    const storedSize: unknown = JSON.parse(localStorage.getItem(GRID_KEY) ?? "null");
    if (isGridSize(storedSize)) gridSize = storedSize;
  } catch {
    // Storage and malformed JSON are optional; the fresh game still starts.
  }
  try {
    const storedScores: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? "null");
    bestScores = parseBestScores(storedScores);
  } catch {
    // Keep whichever other preference was valid.
  }
  return { gridSize, bestScores };
}

export function saveGridSize(size: GridSize): void {
  try {
    localStorage.setItem(GRID_KEY, JSON.stringify(size));
  } catch {
    // A storage failure must not block a game action.
  }
}

export function saveBestScores(scores: BestScores): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(scores));
  } catch {
    // In-memory scores stay available for this session.
  }
}
