import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exactKeys, isIndex, isNonnegativeInteger, isObject, parseLimitedJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const MAX_REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isObject(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !isNonnegativeInteger(value.endMs) || !Array.isArray(value.actions) || value.actions.length > MAX_REPLAY_ACTIONS) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let time = 0;
  const actions: readonly unknown[] = value.actions;
  for (const action of actions) {
    if (!isObject(action) || !exactKeys(action, ['atMs', 'index']) ||
        !isNonnegativeInteger(action.atMs) || action.atMs < time || action.atMs > value.endMs ||
        !isIndex(action.index, state.board.deck.length)) return null;
    state = advanceGame(state, action.atMs - time);
    state = activateCard(state, action.index);
    time = action.atMs;
  }
  return advanceGame(state, value.endMs - time);
}
