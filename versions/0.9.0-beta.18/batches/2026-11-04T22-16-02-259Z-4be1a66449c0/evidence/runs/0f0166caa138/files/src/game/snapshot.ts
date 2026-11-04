import { createGame } from "./boardCode.ts";
import { ELAPSED_CAP_MS, MOVE_CAP, isWon } from "./transitions.ts";
import { CLOSED, type GameState, type Selection } from "./types.ts";

const SNAPSHOT_VERSION = 1;
const MAX_SNAPSHOT_BYTES = 65_536;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function isInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function decodeSelection(
  value: unknown,
  deck: readonly number[],
  matched: ReadonlySet<number>,
): Selection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed" && hasKeys(value, ["kind"])) return CLOSED;
  if (value.kind === "one" && hasKeys(value, ["kind", "index"])) {
    if (!isInteger(value.index, deck.length - 1) || matched.has(value.index)) return null;
    return { kind: "one", index: value.index };
  }
  if (value.kind !== "mismatch" || !hasKeys(value, ["kind", "first", "second", "remainingMs"])) {
    return null;
  }
  if (!isInteger(value.first, deck.length - 1) || !isInteger(value.second, deck.length - 1)) return null;
  if (value.first === value.second || matched.has(value.first) || matched.has(value.second)) return null;
  if (deck[value.first] === deck[value.second]) return null;
  if (!isInteger(value.remainingMs, 800) || value.remainingMs < 1) return null;
  return {
    kind: "mismatch",
    first: value.first,
    second: value.second,
    remainingMs: value.remainingMs,
  };
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || !hasKeys(raw, [
    "version", "boardCode", "matched", "selection", "moves", "elapsedMs", "started",
  ])) return null;
  if (raw.version !== SNAPSHOT_VERSION || typeof raw.boardCode !== "string") return null;
  const game = createGame(raw.boardCode);
  if (!game || !Array.isArray(raw.matched)) return null;
  if (!isInteger(raw.moves, MOVE_CAP) || !isInteger(raw.elapsedMs, ELAPSED_CAP_MS)) return null;
  if (typeof raw.started !== "boolean") return null;

  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const position of raw.matched) {
    if (!isInteger(position, game.deck.length - 1) || matched.includes(position)) return null;
    const face = game.deck[position];
    if (face === undefined) return null;
    matched.push(position);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count !== 2)) return null;
  const matchedSet = new Set(matched);
  const selection = decodeSelection(raw.selection, game.deck, matchedSet);
  if (!selection) return null;
  const pairCount = matched.length / 2;
  const neededMoves = pairCount + (selection.kind === "mismatch" ? 1 : 0);
  if (raw.moves < neededMoves) return null;

  if (!raw.started && (
    raw.moves !== 0 || raw.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== "closed"
  )) return null;
  if (raw.started && raw.moves === 0 && selection.kind !== "one") return null;

  const state: GameState = {
    ...game,
    matched,
    selection,
    moves: raw.moves,
    elapsedMs: raw.elapsedMs,
    started: raw.started,
  };
  if (isWon(state) && selection.kind !== "closed") return null;
  return state;
}

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.boardCode,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}
