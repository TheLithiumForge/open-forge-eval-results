import { createGame } from "./state.ts";
import { SELECTION_KINDS, type GameState, type Selection } from "./state.ts";
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_DURATION_MS } from "./timing.ts";

export const MAX_SNAPSHOT_BYTES = 65_536;
export const SNAPSHOT_VERSION = 1;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function nonnegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!record(value) || typeof value.kind !== "string") return null;
  const deck = state.board.deck;
  const unmatched = (index: number): boolean => index < deck.length && !state.matched.includes(index);
  switch (value.kind) {
    case SELECTION_KINDS.closed:
      return hasKeys(value, ["kind"]) ? Object.freeze({ kind: SELECTION_KINDS.closed }) : null;
    case SELECTION_KINDS.one:
      return hasKeys(value, ["kind", "index"]) && nonnegativeSafeInteger(value.index) && unmatched(value.index)
        ? Object.freeze({ kind: SELECTION_KINDS.one, index: value.index }) : null;
    case SELECTION_KINDS.mismatch:
      if (!hasKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
      if (!nonnegativeSafeInteger(value.first) || !nonnegativeSafeInteger(value.second)
        || value.first === value.second || !unmatched(value.first) || !unmatched(value.second)
        || deck[value.first] === deck[value.second] || !nonnegativeSafeInteger(value.remainingMs)
        || value.remainingMs < 1 || value.remainingMs > MISMATCH_DURATION_MS) return null;
      return Object.freeze({ kind: SELECTION_KINDS.mismatch, first: value.first, second: value.second,
        remainingMs: value.remainingMs });
    default:
      return null;
  }
}

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code, matched: state.matched,
    selection: state.selection, moves: state.moves, elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  const keys = ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"];
  if (!record(value) || !hasKeys(value, keys) || value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== "string"
    || !Array.isArray(value.matched) || !nonnegativeSafeInteger(value.moves) || value.moves > MAX_MOVES
    || !nonnegativeSafeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS
    || typeof value.started !== "boolean") return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!nonnegativeSafeInteger(index) || index >= initial.board.deck.length || matched.includes(index)) return null;
    matched.push(index);
  }
  const faceCounts = new Map<number, number>();
  for (const index of matched) {
    const face = initial.board.deck[index];
    if (face === undefined) return null;
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null;
  const state: GameState = { ...initial, matched: Object.freeze(matched) };
  const selection = decodeSelection(value.selection, state);
  if (!selection || (matched.length === initial.board.deck.length && selection.kind !== SELECTION_KINDS.closed)) return null;
  const minimumMoves = matched.length / 2 + (selection.kind === SELECTION_KINDS.mismatch ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KINDS.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION_KINDS.one) return null;
  return Object.freeze({ ...initial, matched: Object.freeze(matched), selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started });
}
