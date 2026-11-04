import { parseBoardCode } from "./boardCode.ts";
import { createGame, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_DELAY_MS } from "./state.ts";
import type { GameState, Selection } from "./state.ts";

export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 65_536;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseSelection(value: unknown, deck: readonly number[], matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed") {
    return hasExactKeys(value, ["kind"]) ? Object.freeze({ kind: "closed" }) : null;
  }
  if (value.kind === "one") {
    if (!hasExactKeys(value, ["kind", "index"]) || !isCount(value.index)) return null;
    if (value.index >= deck.length || matched.has(value.index)) return null;
    return Object.freeze({ kind: "one", index: value.index });
  }
  if (value.kind === "mismatch") {
    if (!hasExactKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
    if (!isCount(value.first) || !isCount(value.second) || !isCount(value.remainingMs)) return null;
    if (value.first >= deck.length || value.second >= deck.length || value.first === value.second) return null;
    if (value.remainingMs < 1 || value.remainingMs > MISMATCH_DELAY_MS) return null;
    if (matched.has(value.first) || matched.has(value.second)) return null;
    if (deck[value.first] === deck[value.second]) return null;
    return Object.freeze({ kind: "mismatch", first: value.first, second: value.second, remainingMs: value.remainingMs });
  }
  return null;
}

function hasWholePairs(matched: readonly number[], deck: readonly number[]): boolean {
  const counts = new Map<number, number>();
  for (const index of matched) {
    if (index >= deck.length) return false;
    const face = deck[index];
    if (face === undefined) return false;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2);
}

function decodeValue(value: unknown): GameState | null {
  if (!isRecord(value) || !hasExactKeys(value, ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"])) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== "string") return null;
  if (!isCount(value.moves) || value.moves > MAX_MOVES || !isCount(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  if (typeof value.started !== "boolean" || !Array.isArray(value.matched)) return null;
  if (!value.matched.every(isCount)) return null;

  const board = parseBoardCode(value.boardCode);
  const base = createGame(value.boardCode);
  if (board === null || base === null) return null;
  const matched = value.matched;
  const matchedSet = new Set(matched);
  if (matchedSet.size !== matched.length || !hasWholePairs(matched, base.deck)) return null;
  const selection = parseSelection(value.selection, base.deck, matchedSet);
  if (selection === null) return null;

  const pairCount = matched.length / 2;
  const mismatchMoves = selection.kind === "mismatch" ? 1 : 0;
  if (value.moves < pairCount + mismatchMoves) return null;
  if (matched.length === base.deck.length && selection.kind !== "closed") return null;
  if (!value.started) {
    if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== "closed") return null;
  } else if (value.moves === 0 && selection.kind !== "one") {
    return null;
  }

  return Object.freeze({ ...base, matched: Object.freeze([...matched]), selection,
    moves: value.moves, elapsedMs: value.elapsedMs, started: value.started });
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === "mismatch"
    ? { kind: "mismatch", first: state.selection.first, second: state.selection.second,
      remainingMs: Math.min(MISMATCH_DELAY_MS, Math.max(1, Math.ceil(state.selection.remainingMs))) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: [...state.matched], selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    return decodeValue(value);
  } catch {
    return null;
  }
}
