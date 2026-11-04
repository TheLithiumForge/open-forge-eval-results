import { createGame } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import type { GameState } from './state.ts';

const REPLAY_LIMIT = 1_048_576;
const ACTION_LIMIT = 10_000;
const REPLAY_VERSION = 1;
type ReplayAction = Readonly<{ atMs: number; index: number }>;
type Replay = Readonly<{ version: typeof REPLAY_VERSION; boardCode: string; actions: readonly ReplayAction[]; endMs: number }>;
type UnknownRecord = Record<string, unknown>;

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(value: unknown): Replay | null {
  if (!record(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) || value.version !== REPLAY_VERSION ||
      typeof value.boardCode !== 'string' || !Array.isArray(value.actions) || value.actions.length > ACTION_LIMIT ||
      !isTime(value.endMs)) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const item of value.actions) {
    if (!record(item) || !hasKeys(item, ['atMs', 'index']) || !isTime(item.atMs) || !isTime(item.index) ||
        item.atMs < previous) return null;
    previous = item.atMs;
    actions.push({ atMs: item.atMs, index: item.index });
  }
  if (actions.length > 0 && value.endMs < previous) return null;
  return { version: REPLAY_VERSION, boardCode: value.boardCode, actions, endMs: value.endMs };
}

export function runReplay(replay: Replay): GameState | null {
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let previous = 0;
  for (const action of replay.actions) {
    if (action.index >= state.board.deck.length) return null;
    state = advanceGame(state, action.atMs - previous);
    state = activateCard(state, action.index);
    previous = action.atMs;
  }
  return advanceGame(state, replay.endMs - previous);
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > REPLAY_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(text);
    const replay = parseReplay(value);
    return replay === null ? null : runReplay(replay);
  } catch { return null; }
}
