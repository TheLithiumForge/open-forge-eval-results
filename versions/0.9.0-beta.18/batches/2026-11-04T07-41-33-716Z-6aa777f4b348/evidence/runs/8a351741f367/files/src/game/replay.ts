import { exactKeys, isRecord, nonnegativeInteger, parseLimitedJson } from './formatValidation.ts';
import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_MAX_BYTES = 1_048_576;
export const REPLAY_MAX_ACTIONS = 10_000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_MAX_BYTES);
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !Array.isArray(value.actions) || value.actions.length > REPLAY_MAX_ACTIONS ||
      !nonnegativeInteger(value.endMs)) return null;
  let game = createGame(value.boardCode);
  if (!game) return null;
  let previousMs = 0;
  const actions: readonly unknown[] = value.actions;
  for (const action of actions) {
    if (!isRecord(action) || !exactKeys(action, ['atMs', 'index']) ||
        !nonnegativeInteger(action.atMs) || action.atMs < previousMs ||
        !nonnegativeInteger(action.index, game.deck.length - 1)) return null;
    game = activateCard(advanceGame(game, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  return value.endMs < previousMs ? null : advanceGame(game, value.endMs - previousMs);
}
