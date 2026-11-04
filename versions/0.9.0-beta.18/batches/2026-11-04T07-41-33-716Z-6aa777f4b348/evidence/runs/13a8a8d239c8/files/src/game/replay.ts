import { parseBoardCode } from './board.ts';
import { hasExactKeys, isUnknownArray } from './format-validation.ts';
import { advanceGame, activateCard, initialGame, type GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1_048_576;
export const REPLAY_ACTION_LIMIT = 10_000;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

interface ReplayInput {
  readonly boardCode: string;
  readonly actions: readonly ReplayAction[];
  readonly endMs: number;
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > REPLAY_BYTE_LIMIT) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const replay = readReplay(value);
  if (replay === null) return null;

  const board = parseBoardCode(replay.boardCode);
  if (board === null) return null;
  let state = initialGame(board);
  let currentMs = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - currentMs);
    state = activateCard(state, action.index);
    currentMs = action.atMs;
  }
  return advanceGame(state, replay.endMs - currentMs);
}

function readReplay(value: unknown): ReplayInput | null {
  if (!hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string') return null;
  if (!isUnknownArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT) return null;
  if (!isTime(value.endMs)) return null;

  const board = parseBoardCode(value.boardCode);
  if (board === null) return null;
  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const item of value.actions) {
    if (!hasExactKeys(item, ['atMs', 'index']) || !isTime(item.atMs)) return null;
    if (!isIndex(item.index, board.deck.length) || item.atMs < previousTime) return null;
    actions.push({ atMs: item.atMs, index: item.index });
    previousTime = item.atMs;
  }
  if (previousTime > value.endMs) return null;
  return { boardCode: value.boardCode, actions, endMs: value.endMs };
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isIndex(value: unknown, length: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < length;
}

