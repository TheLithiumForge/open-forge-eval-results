import { parseBoardCode } from "./boardCode.ts";
import { createGame, isWon, type GameState, type Selection } from "./state.ts";

const SNAPSHOT_VERSION = 1;
const MAX_SNAPSHOT_BYTES = 65_536;

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed") return hasKeys(value, ["kind"]) ? { kind: "closed" } : null;
  if (value.kind === "one") {
    if (!hasKeys(value, ["kind", "index"]) || !validUnmatchedIndex(state, value.index)) return null;
    return { kind: "one", index: value.index };
  }
  if (value.kind !== "mismatch" || !hasKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
  if (!validUnmatchedIndex(state, value.first) || !validUnmatchedIndex(state, value.second)) return null;
  if (value.first === value.second || state.deck[value.first] === state.deck[value.second]) return null;
  if (typeof value.remainingMs !== "number" || !Number.isSafeInteger(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > 800) return null;
  return { kind: "mismatch", first: value.first, second: value.second, remainingMs: value.remainingMs };
}

function validUnmatchedIndex(state: GameState, value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < state.deck.length && !state.matched.includes(value);
}

export function encodeSnapshot(state: GameState): string {
  const snapshot = {
    version: SNAPSHOT_VERSION,
    boardCode: state.boardCode,
    matched: [...state.matched],
    selection: state.selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started,
  };
  return JSON.stringify(snapshot, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"])) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== "string" || !Array.isArray(value.matched)) return null;
  if (typeof value.started !== "boolean" || !validCounter(value.moves, 999_999) || !validCounter(value.elapsedMs, 359_999_999)) return null;
  const state = createGame(value.boardCode);
  if (state === null) return null;
  const matched = value.matched;
  if (!matched.every((index: unknown) => validIndex(state, index)) || new Set(matched).size !== matched.length) return null;
  for (let face = 0; face < state.deck.length / 2; face += 1) {
    const positions = state.deck.flatMap((valueAt, index) => valueAt === face ? [index] : []);
    const count = positions.filter((index) => matched.includes(index)).length;
    if (count !== 0 && count !== 2) return null;
  }
  const restored: GameState = { ...state, matched, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started, selection: { kind: "closed" } };
  const selection = decodeSelection(value.selection, restored);
  if (selection === null) return null;
  if (isWon(restored) && selection.kind !== "closed") return null;
  const matchedPairs = matched.length / 2;
  const requiredMoves = matchedPairs + (selection.kind === "mismatch" ? 1 : 0);
  if (restored.moves < requiredMoves) return null;
  if (!restored.started && (restored.moves !== 0 || restored.elapsedMs !== 0 || matched.length > 0 || selection.kind !== "closed")) return null;
  if (restored.started && restored.moves === 0 && selection.kind !== "one") return null;
  return { ...restored, selection };
}

function validCounter(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function validIndex(state: GameState, value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < state.deck.length;
}
