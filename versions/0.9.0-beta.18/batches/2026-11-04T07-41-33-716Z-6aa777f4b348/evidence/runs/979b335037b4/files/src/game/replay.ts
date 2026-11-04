import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { hasKeys, isInteger, isRecord, parseJSON } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJSON(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
    value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
    !isInteger(value.endMs) || !Array.isArray(value.actions) ||
    value.actions.length > REPLAY_ACTION_LIMIT) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let cursor = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index']) || !isInteger(action.atMs) ||
      action.atMs < cursor || !isInteger(action.index, state.board.deck.length - 1)) return null;
    state = advanceGame(state, action.atMs - cursor);
    state = activateCard(state, action.index);
    cursor = action.atMs;
  }
  return value.endMs >= cursor ? advanceGame(state, value.endMs - cursor) : null;
}
