import { activateCard, advanceGame, createGame } from './transitions.ts';
import type { GameState } from './model.ts';
import { hasKeys, isInteger, isRecord, parseJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const MAX_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, REPLAY_BYTES);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !isInteger(value.endMs) || !Array.isArray(value.actions) || value.actions.length > MAX_ACTIONS) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let time = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index']) || !isInteger(action.atMs) ||
        action.atMs < time || !isInteger(action.index, state.board.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - time), action.index);
    time = action.atMs;
  }
  return value.endMs >= time ? advanceGame(state, value.endMs - time) : null;
}
