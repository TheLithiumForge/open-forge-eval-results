import { hasExactKeys, isObject, isSafeInteger, parseLimitedJson } from './json.ts';
import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isObject(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT ||
      !isSafeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  const actions: readonly unknown[] = value.actions;
  let previousTime = 0;
  for (const action of actions) {
    if (!isObject(action) || !hasExactKeys(action, ['atMs', 'index']) ||
        !isSafeInteger(action.atMs) || action.atMs < previousTime ||
        !isSafeInteger(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previousTime), action.index);
    previousTime = action.atMs;
  }
  return value.endMs >= previousTime ? advanceGame(state, value.endMs - previousTime) : null;
}
