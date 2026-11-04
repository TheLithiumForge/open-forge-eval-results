import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { hasExactKeys, isRecord, isSafeInteger, parseFormatJson } from './formatInput.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseFormatJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT
    || !isSafeInteger(value.endMs)) return null;
  const actions: readonly unknown[] = value.actions;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousTime = 0;
  for (const action of actions) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])
      || !isSafeInteger(action.atMs) || action.atMs < previousTime
      || !isSafeInteger(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previousTime), action.index);
    previousTime = action.atMs;
  }
  if (value.endMs < previousTime) return null;
  return advanceGame(state, value.endMs - previousTime);
}
