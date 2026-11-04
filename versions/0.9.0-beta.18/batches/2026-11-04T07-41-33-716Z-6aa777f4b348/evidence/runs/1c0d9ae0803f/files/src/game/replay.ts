import { createGame } from "./state.ts";
import type { GameState } from "./state.ts";
import { activateCard, advanceGame } from "./state.ts";

export const MAX_REPLAY_BYTES = 1_048_576;
export const MAX_REPLAY_ACTIONS = 10_000;
export const REPLAY_VERSION = 1;

type ReplayAction = Readonly<{ atMs: number; index: number }>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(text: string): { boardCode: string; actions: ReplayAction[]; endMs: number } | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!record(value) || !exactKeys(value, ["version", "boardCode", "actions", "endMs"])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== "string" || !Array.isArray(value.actions)
    || value.actions.length > MAX_REPLAY_ACTIONS || !isTime(value.endMs)) return null;
  const board = createGame(value.boardCode);
  if (!board) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const action of value.actions) {
    if (!record(action) || !exactKeys(action, ["atMs", "index"]) || !isTime(action.atMs)
      || !isTime(action.index) || action.index >= board.board.deck.length || action.atMs < previous) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previous = action.atMs;
  }
  if (actions.length > 0 && value.endMs < previous) return null;
  return { boardCode: value.boardCode, actions, endMs: value.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (!replay) return null;
  let state = createGame(replay.boardCode);
  if (!state) return null;
  let previous = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - previous);
    state = activateCard(state, action.index);
    previous = action.atMs;
  }
  return advanceGame(state, replay.endMs - previous);
}
