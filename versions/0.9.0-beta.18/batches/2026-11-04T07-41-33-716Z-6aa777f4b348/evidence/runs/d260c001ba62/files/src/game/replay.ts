import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { array, exactKeys, integer, parseJson, record } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, REPLAY_BYTE_LIMIT);
  if (!record(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
    value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !integer(value.endMs) ||
    !array(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousTime = 0;
  for (const action of value.actions) {
    if (!record(action) || !exactKeys(action, ['atMs', 'index']) || !integer(action.atMs) ||
      !integer(action.index, state.board.deck.length - 1) || action.atMs < previousTime || action.atMs > value.endMs) return null;
    state = advanceGame(state, action.atMs - previousTime);
    state = activateCard(state, action.index);
    previousTime = action.atMs;
  }
  return advanceGame(state, value.endMs - previousTime);
}
