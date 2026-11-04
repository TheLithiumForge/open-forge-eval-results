import { FORMAT_VERSION, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SNAPSHOT_LIMIT_BYTES } from "./constants.ts";
import { parseBoardCode } from "./board.ts";
import type { GameState, Selection } from "./types.ts";

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: FORMAT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const isCount = (value: unknown, maximum: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const isPosition = (value: unknown, count: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value < count;

function readSelection(value: unknown, deck: readonly number[], matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed" && hasKeys(value, ["kind"])) return Object.freeze({ kind: "closed" });
  if (value.kind === "one" && hasKeys(value, ["kind", "index"]) && isPosition(value.index, deck.length) && !matched.has(value.index)) {
    return Object.freeze({ kind: "one", index: value.index });
  }
  const first = value.first;
  const second = value.second;
  const remainingMs = value.remainingMs;
  if (value.kind !== "mismatch" || !hasKeys(value, ["kind", "first", "second", "remainingMs"])) return null;
  if (!isPosition(first, deck.length) || !isPosition(second, deck.length) || first === second) return null;
  if (matched.has(first) || matched.has(second) || deck[first] === deck[second]) return null;
  if (!isCount(remainingMs, MISMATCH_MS) || remainingMs === 0) return null;
  return Object.freeze({ kind: "mismatch", first, second, remainingMs });
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_LIMIT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ["version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started"])) return null;
  if (value.version !== FORMAT_VERSION || typeof value.boardCode !== "string" || !Array.isArray(value.matched)) return null;
  if (!isCount(value.moves, MAX_MOVES) || !isCount(value.elapsedMs, MAX_ELAPSED_MS) || typeof value.started !== "boolean") return null;
  const board = parseBoardCode(value.boardCode);
  if (!board) return null;
  const positions = new Set<number>();
  for (const position of value.matched) {
    if (!isPosition(position, board.deck.length) || positions.has(position)) return null;
    positions.add(position);
  }
  for (const position of positions) {
    const face = board.deck[position];
    if (face === undefined) return null;
    const pair = board.deck.flatMap((candidate, index) => candidate === face ? [index] : []);
    if (pair.some((index) => !positions.has(index))) return null;
  }
  const selection = readSelection(value.selection, board.deck, positions);
  if (!selection || (positions.size === board.deck.length && selection.kind !== "closed")) return null;
  const pairs = positions.size / 2;
  if (value.moves < pairs + (selection.kind === "mismatch" ? 1 : 0)) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || positions.size !== 0 || selection.kind !== "closed")) return null;
  if (value.started && value.moves === 0 && selection.kind !== "one") return null;
  return Object.freeze({ board, matched: Object.freeze([...positions]), selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started });
}
