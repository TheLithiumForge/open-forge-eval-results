import { MAX_ELAPSED_MS, MAX_MOVES, MAX_SNAPSHOT_BYTES, MISMATCH_MS, SELECTION_KIND, SNAPSHOT_KEYS, SNAPSHOT_VERSION } from "./constants.ts";
import { createGame } from "./transition.ts";
import type { GameState, Selection } from "./state.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function inRangeIndex(value: unknown, length: number): value is number {
  return safeInteger(value) && value < length;
}

function decodeSelection(value: unknown, state: GameState, matched: Set<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === SELECTION_KIND.closed) return hasKeys(value, ["kind"]) ? { kind: SELECTION_KIND.closed } : null;
  if (value.kind === SELECTION_KIND.one) {
    return hasKeys(value, ["kind", "index"]) && inRangeIndex(value.index, state.deck.length) && !matched.has(value.index)
      ? { kind: SELECTION_KIND.one, index: value.index }
      : null;
  }
  if (value.kind === SELECTION_KIND.mismatch) {
    const keysValid = hasKeys(value, ["kind", "first", "second", "remainingMs"]);
    if (!keysValid || !inRangeIndex(value.first, state.deck.length) || !inRangeIndex(value.second, state.deck.length)) return null;
    if (value.first === value.second || matched.has(value.first) || matched.has(value.second)) return null;
    if (state.deck[value.first] === state.deck[value.second]) return null;
    if (!safeInteger(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
    return { kind: SELECTION_KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
  }
  return null;
}

function containsWholePairs(matched: readonly number[], deck: readonly number[]): boolean {
  const positions = new Set(matched);
  if (positions.size !== matched.length || matched.some((index) => !inRangeIndex(index, deck.length))) return false;
  return matched.every((index) => deck.every((face, other) => face !== deck[index] || positions.has(other)));
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION_KIND.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION) return null;
  if (typeof value.boardCode !== "string" || !Array.isArray(value.matched)) return null;
  if (!safeInteger(value.moves) || value.moves > MAX_MOVES || !safeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  if (typeof value.started !== "boolean") return null;

  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched: number[] = [];
  for (const item of value.matched) {
    const index: unknown = item;
    if (!inRangeIndex(index, game.deck.length)) return null;
    matched.push(index);
  }
  if (!containsWholePairs(matched, game.deck)) return null;
  const positions = new Set(matched);
  const selection = decodeSelection(value.selection, game, positions);
  if (!selection || (matched.length === game.deck.length && selection.kind !== SELECTION_KIND.closed)) return null;
  const pendingMove = selection.kind === SELECTION_KIND.mismatch ? 1 : 0;
  if (value.moves < matched.length / 2 + pendingMove) return null;

  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.closed)) return null;
  if (value.started && value.moves === 0 && (selection.kind !== SELECTION_KIND.one || matched.length !== 0)) return null;
  return { ...game, matched: [...matched], selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}
