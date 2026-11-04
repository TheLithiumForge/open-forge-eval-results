import { parseBoardCode } from "./board-code.ts";
import { advanceGame, activateCard } from "./transitions.ts";
import { createGame, type GameState } from "./state.ts";

const REPLAY_BYTE_LIMIT = 1_048_576;
const ACTION_LIMIT = 10_000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_BYTE_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { return null; }
  if (!record(value) || !exactKeys(value, ["version", "boardCode", "actions", "endMs"]) || value.version !== 1 ||
      typeof value.boardCode !== "string" || !Array.isArray(value.actions) || value.actions.length > ACTION_LIMIT ||
      !timestamp(value.endMs)) return null;
  const board = parseBoardCode(value.boardCode);
  if (!board || (value.actions.length > 0 && !isAction(value.actions.at(-1), value.endMs, board.deck.length))) return null;
  let previousTime = 0;
  for (const action of value.actions) {
    if (!isAction(action, Number.MAX_SAFE_INTEGER, board.deck.length) || action.atMs < previousTime) return null;
    previousTime = action.atMs;
  }
  if (value.endMs < previousTime) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  previousTime = 0;
  for (const action of value.actions) {
    state = advanceGame(state, action.atMs - previousTime);
    state = activateCard(state, action.index);
    previousTime = action.atMs;
  }
  return advanceGame(state, value.endMs - previousTime);
}

function isAction(value: unknown, maxTime: number, deckLength: number): value is { atMs: number; index: number } {
  return record(value) && exactKeys(value, ["atMs", "index"]) && timestamp(value.atMs) && value.atMs <= maxTime &&
    timestamp(value.index) && value.index < deckLength;
}
