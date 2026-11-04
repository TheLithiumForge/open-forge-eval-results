import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './turn.ts';
import { hasKeys, isRecord, nonnegativeInteger, parseJSON } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const MAX_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJSON(text, REPLAY_BYTES);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !Array.isArray(value.actions) || value.actions.length > MAX_ACTIONS
    || !nonnegativeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousMs = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index'])
      || !nonnegativeInteger(action.atMs) || action.atMs < previousMs
      || !nonnegativeInteger(action.index, state.deck.length - 1)) return null;
    state = activateCard(advanceGame(state, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  if (value.endMs < previousMs) return null;
  return advanceGame(state, value.endMs - previousMs);
}
