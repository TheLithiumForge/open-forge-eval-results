import { createGame, activateCard, advanceGame } from "./turns.ts";
import { hasExactlyKeys, isRecord, isSafeMilliseconds, withinUtf8Limit } from "./inputValidation.ts";
import type { GameState } from "./model.ts";

const REPLAY_LIMIT_BYTES = 1_048_576;
const ACTION_LIMIT = 10_000;

type ReplayAction = Readonly<{ atMs: number; index: number }>;

function readReplay(value: unknown): Readonly<{ game: GameState; actions: readonly ReplayAction[]; endMs: number }> | null {
  if (!isRecord(value) || !hasExactlyKeys(value, ["version", "boardCode", "actions", "endMs"])) return null;
  if (value.version !== 1 || typeof value.boardCode !== "string" || !Array.isArray(value.actions)) return null;
  if (value.actions.length > ACTION_LIMIT || !isSafeMilliseconds(value.endMs)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !hasExactlyKeys(item, ["atMs", "index"])) return null;
    const atMs = item.atMs;
    const index = item.index;
    if (!isSafeMilliseconds(atMs) || typeof index !== "number" || !Number.isSafeInteger(index)) return null;
    if (index < 0 || index >= game.board.deck.length || atMs < previousTime) return null;
    actions.push({ atMs, index });
    previousTime = atMs;
  }
  if (actions.length > 0 && value.endMs < previousTime) return null;
  return { game, actions, endMs: value.endMs };
}

export function replayGame(text: string): GameState | null {
  if (!withinUtf8Limit(text, REPLAY_LIMIT_BYTES)) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const replay = readReplay(value);
  if (!replay) return null;
  let state = replay.game;
  let cursor = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - cursor);
    state = activateCard(state, action.index);
    cursor = action.atMs;
  }
  return advanceGame(state, replay.endMs - cursor);
}
