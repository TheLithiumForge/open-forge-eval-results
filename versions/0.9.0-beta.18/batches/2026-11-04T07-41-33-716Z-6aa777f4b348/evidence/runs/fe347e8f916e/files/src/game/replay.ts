import { createGame } from './model.ts';
import type { GameState } from './model.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exactKeys, integer, object, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_LIMIT = 1048576;
export const MAX_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const data = parseJson(text, REPLAY_LIMIT);
  if (!object(data) || !exactKeys(data, ['version', 'boardCode', 'actions', 'endMs']) ||
      data.version !== REPLAY_VERSION || typeof data.boardCode !== 'string' ||
      !Array.isArray(data.actions) || data.actions.length > MAX_ACTIONS || !integer(data.endMs)) return null;
  let state = createGame(data.boardCode);
  if (!state) return null;
  let previous = 0;
  for (const action of data.actions) {
    if (!object(action) || !exactKeys(action, ['atMs', 'index']) ||
        !integer(action.atMs) || action.atMs < previous ||
        !integer(action.index, state.board.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previous), action.index);
    previous = action.atMs;
  }
  return data.endMs < previous ? null : advanceGame(state, data.endMs - previous);
}
