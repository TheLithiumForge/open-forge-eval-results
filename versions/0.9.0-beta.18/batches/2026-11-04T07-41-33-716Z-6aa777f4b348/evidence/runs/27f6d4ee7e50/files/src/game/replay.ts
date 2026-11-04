import { parseBoardCode } from "./boardCode.ts";
import { advanceGame, activateCard, createGame } from "./state.ts";
import type { GameState } from "./state.ts";

export const REPLAY_VERSION = 1;
export const MAX_REPLAY_BYTES = 1_048_576;
export const MAX_REPLAY_ACTIONS = 10_000;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

interface ReplayData {
  readonly boardCode: string;
  readonly actions: readonly ReplayAction[];
  readonly endMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseReplayValue(value: unknown): ReplayData | null {
  if (!isRecord(value) || !exactKeys(value, ["version", "boardCode", "actions", "endMs"])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== "string" || !isTime(value.endMs)) return null;
  if (!Array.isArray(value.actions) || value.actions.length > MAX_REPLAY_ACTIONS) return null;
  const board = parseBoardCode(value.boardCode);
  if (board === null) return null;

  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !exactKeys(item, ["atMs", "index"])) return null;
    if (!isTime(item.atMs) || !isTime(item.index) || item.index >= board.size * board.size) return null;
    if (item.atMs < previousTime) return null;
    actions.push({ atMs: item.atMs, index: item.index });
    previousTime = item.atMs;
  }
  if (actions.length > 0 && value.endMs < previousTime) return null;
  return { boardCode: value.boardCode, actions, endMs: value.endMs };
}

function runReplay(replay: ReplayData): GameState | null {
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let previousTime = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - previousTime);
    state = activateCard(state, action.index);
    previousTime = action.atMs;
  }
  return advanceGame(state, replay.endMs - previousTime);
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    const replay = parseReplayValue(value);
    return replay === null ? null : runReplay(replay);
  } catch {
    return null;
  }
}
