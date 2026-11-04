import { createBoard } from "./board.ts";
import { GAME_LIMITS, closedSelection, type GameState, type Selection } from "./types.ts";

const snapshotKeys = ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"];
export const SNAPSHOT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function safeWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function selectionValue(value: unknown, stateDeck: readonly number[], matched: ReadonlySet<number>): Selection | null {
  const selection = record(value);
  if (selection === null || typeof selection.kind !== "string") return null;
  if (selection.kind === "closed") return hasExactKeys(selection, ["kind"]) ? closedSelection : null;
  if (selection.kind === "one") {
    if (!hasExactKeys(selection, ["kind", "index"]) || !safeWhole(selection.index)) return null;
    if (selection.index >= stateDeck.length || matched.has(selection.index)) return null;
    return { kind: "one", index: selection.index };
  }
  if (selection.kind !== "mismatch" || !hasExactKeys(selection, ["kind", "first", "second", "remainingMs"])) return null;
  const first = selection.first;
  const second = selection.second;
  const remainingMs = selection.remainingMs;
  if (!safeWhole(first) || !safeWhole(second) || !safeWhole(remainingMs)) return null;
  if (first >= stateDeck.length || second >= stateDeck.length || first === second) return null;
  if (remainingMs < 1 || remainingMs > GAME_LIMITS.mismatchMs) return null;
  if (matched.has(first) || matched.has(second) || stateDeck[first] === stateDeck[second]) return null;
  return { kind: "mismatch", first, second, remainingMs };
}

function hasWholeMatchedPairs(indices: readonly number[], deck: readonly number[]): boolean {
  const selected = new Set(indices);
  for (let face = 0; face < deck.length / 2; face += 1) {
    let total = 0;
    let marked = 0;
    for (let index = 0; index < deck.length; index += 1) {
      if (deck[index] === face) {
        total += 1;
        if (selected.has(index)) marked += 1;
      }
    }
    if (total !== 2 || (marked !== 0 && marked !== 2)) return false;
  }
  return true;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === "mismatch"
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: [...state.matched],
    selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > GAME_LIMITS.snapshotBytes) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  const input = record(parsed);
  if (input === null || !hasExactKeys(input, snapshotKeys) || input.version !== SNAPSHOT_VERSION) return null;
  if (typeof input.boardCode !== "string" || !Array.isArray(input.matched)) return null;
  const board = createBoard(input.boardCode);
  if (board === null) return null;
  const indices: number[] = [];
  for (const index of input.matched) {
    if (!safeWhole(index) || index >= board.deck.length || indices.includes(index)) return null;
    indices.push(index);
  }
  if (!hasWholeMatchedPairs(indices, board.deck)) return null;
  const matched = new Set(indices);
  const selection = selectionValue(input.selection, board.deck, matched);
  if (selection === null || (indices.length === board.deck.length && selection.kind !== "closed")) return null;
  if (!safeWhole(input.moves) || input.moves > GAME_LIMITS.maxMoves) return null;
  if (!safeWhole(input.elapsedMs) || input.elapsedMs > GAME_LIMITS.maxElapsedMs) return null;
  if (typeof input.started !== "boolean") return null;
  const requiredMoves = indices.length / 2 + (selection.kind === "mismatch" ? 1 : 0);
  if (input.moves < requiredMoves) return null;
  if (!input.started && (input.moves !== 0 || input.elapsedMs !== 0 || indices.length !== 0 || selection.kind !== "closed")) return null;
  if (input.started && input.moves === 0 && selection.kind !== "one") return null;
  return { board, matched: indices, selection, moves: input.moves, elapsedMs: input.elapsedMs, started: input.started };
}
