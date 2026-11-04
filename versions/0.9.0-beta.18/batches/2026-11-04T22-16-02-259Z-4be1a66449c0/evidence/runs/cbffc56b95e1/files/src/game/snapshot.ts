import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SNAPSHOT_VERSION } from "./constants.ts";
import { createGame, isWon, type GameState, type Selection } from "./game.ts";

const SNAPSHOT_LIMIT_BYTES = 65_536;
const ROOT_KEYS = ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isSafeCount(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function decodeSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed") return hasExactKeys(value, ["kind"]) ? { kind: "closed" } : null;
  if (value.kind === "one") {
    if (!hasExactKeys(value, ["kind", "index"]) || typeof value.index !== "number" || !Number.isSafeInteger(value.index)) return null;
    const index = value.index;
    return index >= 0 && index < state.deck.length && !state.matched.has(index) ? { kind: "one", index } : null;
  }
  if (value.kind === "mismatch") {
    if (!hasExactKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
    if (typeof value.first !== "number" || !Number.isSafeInteger(value.first)) return null;
    if (typeof value.second !== "number" || !Number.isSafeInteger(value.second)) return null;
    if (typeof value.remainingMs !== "number" || !Number.isSafeInteger(value.remainingMs)) return null;
    const first = value.first;
    const second = value.second;
    const remainingMs = value.remainingMs;
    if (first < 0 || first >= state.deck.length || second < 0 || second >= state.deck.length || first === second) return null;
    if (state.matched.has(first) || state.matched.has(second) || state.deck[first] === state.deck[second]) return null;
    return remainingMs >= 1 && remainingMs <= MISMATCH_MS ? { kind: "mismatch", first, second, remainingMs } : null;
  }
  return null;
}

export function encodeSnapshot(state: GameState): string {
  const snapshot = {
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: [...state.matched].sort((a, b) => a - b),
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  };
  return JSON.stringify(snapshot);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > SNAPSHOT_LIMIT_BYTES) return null;
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) return null;
  if (input.version !== SNAPSHOT_VERSION || typeof input.boardCode !== "string") return null;
  const initial = createGame(input.boardCode);
  if (initial === null || initial.board.code !== input.boardCode) return null;
  if (!isUnknownArray(input.matched) || !isSafeCount(input.moves, MAX_MOVES) || !isSafeCount(input.elapsedMs, MAX_ELAPSED_MS)) return null;
  if (typeof input.started !== "boolean") return null;
  const matched = new Set<number>();
  for (const index of input.matched) {
    if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= initial.deck.length || matched.has(index)) return null;
    matched.add(index);
  }
  const faces = new Set<number>();
  for (const index of matched) faces.add(initial.deck[index]!);
  for (const face of faces) {
    if (matched.size < 2 || [...matched].filter((index) => initial.deck[index] === face).length !== 2) return null;
  }
  const partial = { ...initial, matched };
  const selection = decodeSelection(input.selection, partial);
  if (selection === null) return null;
  const pairCount = matched.size / 2;
  const moves = input.moves;
  const elapsedMs = input.elapsedMs;
  const selectionCost = selection.kind === "mismatch" ? 1 : 0;
  if (moves < pairCount + selectionCost) return null;
  if (!input.started) {
    if (moves !== 0 || elapsedMs !== 0 || matched.size !== 0 || selection.kind !== "closed") return null;
  } else if (moves === 0 && (selection.kind !== "one" || matched.size !== 0)) {
    return null;
  }
  const restored: GameState = { ...initial, matched, selection, moves, elapsedMs, started: input.started };
  if (isWon(restored) && selection.kind !== "closed") return null;
  return restored;
}
