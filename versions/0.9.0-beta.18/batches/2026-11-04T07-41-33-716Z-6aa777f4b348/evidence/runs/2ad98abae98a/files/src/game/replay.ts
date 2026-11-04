import { createGame } from './deal.ts';
import type { GameState } from './model.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exactKeys, integer, isObject, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, REPLAY_BYTES);
  if (!isObject(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !integer(value.endMs) || !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTIONS) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previous = 0;
  for (const action of value.actions) {
    if (!isObject(action) || !exactKeys(action, ['atMs', 'index']) || !integer(action.atMs) ||
        action.atMs < previous || !integer(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previous), action.index);
    previous = action.atMs;
  }
  return value.endMs < previous ? null : advanceGame(state, value.endMs - previous);
}
