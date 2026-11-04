import { parseBoardCode } from './boardCode.ts';
import { activateCard, advanceGame, createGame } from './game.ts';
import type { GameState } from './state.ts';
import {
  hasExactKeys, isNonnegativeInteger, isPosition, isRecord, isUnknownArray, parseLimitedJson,
} from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const MAX_REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !parseBoardCode(value.boardCode) || !isUnknownArray(value.actions)
    || value.actions.length > MAX_REPLAY_ACTIONS || !isNonnegativeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  let previousTime = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])
      || !isNonnegativeInteger(action.atMs) || action.atMs < previousTime
      || !isPosition(action.index, state.deck.length)) return null;
    state = activateCard(advanceGame(state, action.atMs - previousTime), action.index);
    previousTime = action.atMs;
  }
  if (value.endMs < previousTime) return null;
  return advanceGame(state, value.endMs - previousTime);
}
