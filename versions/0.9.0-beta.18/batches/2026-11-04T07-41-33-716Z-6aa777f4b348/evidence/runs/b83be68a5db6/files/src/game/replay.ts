import { hasKeys, isNatural, isRecord, parseJson } from './json.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './turn.ts';

export const replayVersion = 1;
export const replayByteLimit = 1048576;
export const replayActionLimit = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseJson(text, replayByteLimit);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
    value.version !== replayVersion || typeof value.boardCode !== 'string' ||
    !isNatural(value.endMs) || !Array.isArray(value.actions) ||
    value.actions.length > replayActionLimit) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  let time = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index']) ||
      !isNatural(action.atMs) || action.atMs < time || !isNatural(action.index) ||
      action.index >= state.board.deck.length) return null;
    state = activateCard(advanceGame(state, action.atMs - time), action.index);
    time = action.atMs;
  }
  return value.endMs >= time ? advanceGame(state, value.endMs - time) : null;
}
