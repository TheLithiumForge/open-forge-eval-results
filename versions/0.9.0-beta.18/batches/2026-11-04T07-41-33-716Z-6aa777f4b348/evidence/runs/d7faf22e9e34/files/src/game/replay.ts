import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { exactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './formatValidation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1_048_576;
export const REPLAY_ACTION_LIMIT = 10_000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !isNonnegativeInteger(value.endMs) || !Array.isArray(value.actions) ||
      value.actions.length > REPLAY_ACTION_LIMIT) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousMs = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !exactKeys(action, ['atMs', 'index']) ||
        !isNonnegativeInteger(action.atMs) || !isNonnegativeInteger(action.index) ||
        action.index >= state.deck.length || action.atMs < previousMs) return null;
    state = activateCard(advanceGame(state, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  if (value.endMs < previousMs) return null;
  return advanceGame(state, value.endMs - previousMs);
}
