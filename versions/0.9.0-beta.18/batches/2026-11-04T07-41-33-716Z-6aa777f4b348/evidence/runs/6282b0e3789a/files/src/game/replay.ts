import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { createGame } from './createGame.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, isUnknownArray, parseLimitedJSON } from './jsonInput.ts';
import { isPosition } from './snapshotSelection.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJSON(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !isUnknownArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT ||
      !isNonnegativeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let previousTime = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index']) ||
        !isNonnegativeInteger(action.atMs) || action.atMs < previousTime ||
        !isPosition(action.index, state.deck.length)) return null;
    state = activateCard(advanceGame(state, action.atMs - previousTime), action.index);
    previousTime = action.atMs;
  }
  return value.endMs >= previousTime ? advanceGame(state, value.endMs - previousTime) : null;
}
