import { parseBoardCode } from "./boardCode.ts";
import { hasExactlyKeys, isRecord, isSafeMilliseconds, withinUtf8Limit } from "./inputValidation.ts";
import { MOVE_LIMIT, TIME_LIMIT_MS, type GameState, type Selection } from "./model.ts";
import { createGame, isWon } from "./turns.ts";

const SNAPSHOT_LIMIT_BYTES = 65_536;
const SNAPSHOT_KEYS = ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"] as const;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: 1,
    boardCode: state.board.code,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}

function inRangeIndex(value: unknown, length: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < length;
}

function readSelection(value: unknown, game: GameState, matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed") return hasExactlyKeys(value, ["kind"]) ? { kind: "closed" } : null;
  if (value.kind === "one") {
    if (!hasExactlyKeys(value, ["kind", "index"]) || !inRangeIndex(value.index, game.board.deck.length)) return null;
    return matched.has(value.index) ? null : { kind: "one", index: value.index };
  }
  if (value.kind !== "mismatch" || !hasExactlyKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
  if (!inRangeIndex(value.first, game.board.deck.length) || !inRangeIndex(value.second, game.board.deck.length)) return null;
  if (value.first === value.second || matched.has(value.first) || matched.has(value.second)) return null;
  if (game.board.deck[value.first] === game.board.deck[value.second]) return null;
  if (typeof value.remainingMs !== "number" || !Number.isInteger(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > 800) return null;
  return { kind: "mismatch", first: value.first, second: value.second, remainingMs: value.remainingMs };
}

export function decodeSnapshot(text: string): GameState | null {
  if (!withinUtf8Limit(text, SNAPSHOT_LIMIT_BYTES)) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || !hasExactlyKeys(value, SNAPSHOT_KEYS) || value.version !== 1) return null;
  if (typeof value.boardCode !== "string" || !parseBoardCode(value.boardCode)) return null;
  if (!Array.isArray(value.matched) || !isSafeMilliseconds(value.moves) || value.moves > MOVE_LIMIT) return null;
  if (!isSafeMilliseconds(value.elapsedMs) || value.elapsedMs > TIME_LIMIT_MS || typeof value.started !== "boolean") return null;

  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched: number[] = [];
  const matchedSet = new Set<number>();
  for (const index of value.matched) {
    if (!inRangeIndex(index, initial.board.deck.length) || matchedSet.has(index)) return null;
    matchedSet.add(index);
    matched.push(index);
  }
  const faceCounts = new Map<number, number>();
  for (const index of matched) {
    const face = initial.board.deck[index]!;
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null;

  const selection = readSelection(value.selection, initial, matchedSet);
  if (!selection) return null;
  const pairs = matched.length / 2;
  if (value.moves < pairs + (selection.kind === "mismatch" ? 1 : 0)) return null;
  if (isWon({ ...initial, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started }) && selection.kind !== "closed") return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== "closed")) return null;
  if (value.started && value.moves === 0 && selection.kind !== "one") return null;

  return { ...initial, matched: Object.freeze(matched), selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}
