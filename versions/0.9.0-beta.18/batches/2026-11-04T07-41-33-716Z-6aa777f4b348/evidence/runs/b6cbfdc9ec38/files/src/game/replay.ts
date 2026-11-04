import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { hasExactKeys, isNatural, isPosition, isRecord, isUnknownArray, parseLimitedJson } from './json.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const MAX_REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !isNatural(value.endMs) || !isUnknownArray(value.actions)
    || value.actions.length > MAX_REPLAY_ACTIONS) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  let state = initial;
  let previousMs = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])
      || !isNatural(action.atMs) || !isPosition(action.index, state.deck.length)
      || action.atMs < previousMs || action.atMs > value.endMs) return null;
    state = activateCard(advanceGame(state, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  return advanceGame(state, value.endMs - previousMs);
}
