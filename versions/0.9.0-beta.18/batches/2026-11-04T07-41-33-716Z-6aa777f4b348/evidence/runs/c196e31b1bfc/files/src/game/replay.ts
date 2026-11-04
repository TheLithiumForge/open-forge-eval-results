import { parseBoardCode } from "./boardCode.ts";
import { activateCard, advanceGame, createGame, type GameState } from "./state.ts";

const REPLAY_VERSION = 1;
const MAX_REPLAY_BYTES = 1_048_576;
const MAX_ACTIONS = 10_000;

interface ReplayAction { readonly atMs: number; readonly index: number }
interface Replay { readonly boardCode: string; readonly actions: readonly ReplayAction[]; readonly endMs: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function decodeReplay(text: string): Replay | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ["version", "boardCode", "actions", "endMs"])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== "string" || !Array.isArray(value.actions)) return null;
  const board = parseBoardCode(value.boardCode);
  if (board === null || value.actions.length > MAX_ACTIONS || !validTime(value.endMs)) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !hasKeys(item, ["atMs", "index"]) || !validTime(item.atMs)) return null;
    if (!Number.isSafeInteger(item.index) || typeof item.index !== "number" || item.index < 0 || item.index >= board.deck.length) return null;
    if (actions.length > 0 && item.atMs < previous) return null;
    previous = item.atMs;
    actions.push({ atMs: item.atMs, index: item.index });
  }
  if (actions.length > 0 && value.endMs < previous) return null;
  return { boardCode: value.boardCode, actions, endMs: value.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = decodeReplay(text);
  if (replay === null) return null;
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let cursor = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - cursor);
    state = activateCard(state, action.index);
    cursor = action.atMs;
  }
  return advanceGame(state, replay.endMs - cursor);
}
