import { hasExactKeys, isNonnegativeSafeInteger, parseLimitedJson } from './formats.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !isNonnegativeSafeInteger(value.endMs) || !Array.isArray(value.actions)
    || value.actions.length > REPLAY_ACTION_LIMIT) return null;
  let game = createGame(value.boardCode);
  if (!game) return null;
  const actions: readonly unknown[] = value.actions;
  let currentMs = 0;
  for (const action of actions) {
    if (!hasExactKeys(action, ['atMs', 'index']) || !isNonnegativeSafeInteger(action.atMs)
      || !isNonnegativeSafeInteger(action.index) || action.index >= game.board.deck.length
      || action.atMs < currentMs || action.atMs > value.endMs) return null;
    game = activateCard(advanceGame(game, action.atMs - currentMs), action.index);
    currentMs = action.atMs;
  }
  return advanceGame(game, value.endMs - currentMs);
}
