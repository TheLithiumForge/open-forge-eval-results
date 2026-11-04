import { hasKeys, isInteger, isRecord, readJSON } from './formatValidation.ts';
import { activateCard, advanceGame } from './rules.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTES = 1048576;
export const REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = readJSON(text, REPLAY_BYTES);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !Array.isArray(value.actions) || value.actions.length > REPLAY_ACTIONS ||
      !isInteger(value.endMs)) return null;
  let game = createGame(value.boardCode);
  if (!game) return null;
  let previousMs = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index']) ||
        !isInteger(action.atMs) || action.atMs < previousMs ||
        !isInteger(action.index, game.deck.length - 1)) return null;
    game = activateCard(advanceGame(game, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  if (value.endMs < previousMs) return null;
  return advanceGame(game, value.endMs - previousMs);
}
