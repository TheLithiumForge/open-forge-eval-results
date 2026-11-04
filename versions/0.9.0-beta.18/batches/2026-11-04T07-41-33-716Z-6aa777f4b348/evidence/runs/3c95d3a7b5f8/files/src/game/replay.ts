import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { parseBoardCode } from './boardCode.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './formatInput.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

function decodeActions(value: unknown, length: number): readonly ReplayAction[] | null {
  if (!Array.isArray(value) || value.length > REPLAY_ACTION_LIMIT) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const action of value) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])) return null;
    if (!isNonnegativeInteger(action.atMs) || action.atMs < previous) return null;
    if (!isNonnegativeInteger(action.index) || action.index >= length) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previous = action.atMs;
  }
  return actions;
}

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string') return null;
  if (!parseBoardCode(value.boardCode) || !isNonnegativeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  const actions = decodeActions(value.actions, state.board.deck.length);
  if (!actions) return null;
  let previous = 0;
  for (const action of actions) {
    if (action.atMs > value.endMs) return null;
    state = activateCard(advanceGame(state, action.atMs - previous), action.index);
    previous = action.atMs;
  }
  return advanceGame(state, value.endMs - previous);
}
