import { parseBoardCode } from "./board-code.ts";
import { ELAPSED_LIMIT, MOVE_LIMIT, type GameState, type Selection } from "./state.ts";

const SNAPSHOT_LIMIT = 65_536;
const SNAPSHOT_KEYS = ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function safeInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: 1,
    boardCode: state.board.boardCode,
    matched: [...state.matched].sort((a, b) => a - b),
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { return null; }
  if (!record(value) || !hasKeys(value, SNAPSHOT_KEYS) || value.version !== 1 || typeof value.boardCode !== "string") return null;
  const board = parseBoardCode(value.boardCode);
  if (!board || !Array.isArray(value.matched) || !safeInteger(value.moves, MOVE_LIMIT) ||
      !safeInteger(value.elapsedMs, ELAPSED_LIMIT) || typeof value.started !== "boolean") return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!safeInteger(index, board.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const selected = decodeSelection(value.selection, board.deck.length, matched);
  if (!selected) return null;
  const pairCount = matched.length / 2;
  for (const index of matched) {
    const face = board.deck[index];
    if (matched.filter((position) => board.deck[position] === face).length !== 2) return null;
  }
  const minimumMoves = pairCount + (selected.kind === "mismatch" ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  const complete = matched.length === board.deck.length;
  if (complete && selected.kind !== "closed") return null;
  if (!value.started) {
    if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selected.kind !== "closed") return null;
  } else if (value.moves === 0 && selected.kind !== "one") return null;
  return Object.freeze({
    board,
    matched: Object.freeze(matched),
    selection: selected,
    moves: value.moves,
    elapsedMs: value.elapsedMs,
    started: value.started,
  });
}

function decodeSelection(value: unknown, deckLength: number, matched: readonly number[]): Selection | null {
  if (!record(value) || typeof value.kind !== "string") return null;
  const available = (index: unknown): index is number => safeInteger(index, deckLength - 1) && !matched.includes(index);
  if (value.kind === "closed" && hasKeys(value, ["kind"])) return Object.freeze({ kind: "closed" });
  if (value.kind === "one" && hasKeys(value, ["kind", "index"]) && available(value.index)) {
    return Object.freeze({ kind: "one", index: value.index });
  }
  if (value.kind === "mismatch" && hasKeys(value, ["kind", "first", "second", "remainingMs"]) &&
      available(value.first) && available(value.second) && value.first !== value.second &&
      safeInteger(value.remainingMs, 800) && value.remainingMs >= 1) {
    return Object.freeze({ kind: "mismatch", first: value.first, second: value.second, remainingMs: value.remainingMs });
  }
  return null;
}

