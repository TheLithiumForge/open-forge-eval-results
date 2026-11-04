import { hasExactKeys, isRecord, isSafeNonnegative, parseLimitedJson } from './formatValidation.ts';
import { isPosition } from './snapshotSelection.ts';
import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const MAX_REPLAY_BYTES = 1048576;
export const MAX_REPLAY_ACTIONS = 10000;

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, MAX_REPLAY_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !Array.isArray(value.actions) || value.actions.length > MAX_REPLAY_ACTIONS ||
      !isSafeNonnegative(value.endMs)) return null;
  let game = createGame(value.boardCode);
  if (!game) return null;
  const actions: readonly unknown[] = value.actions;
  let previousMs = 0;
  for (const action of actions) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index']) ||
        !isSafeNonnegative(action.atMs) || action.atMs < previousMs ||
        !isPosition(action.index, game.board.deck.length)) return null;
    game = activateCard(advanceGame(game, action.atMs - previousMs), action.index);
    previousMs = action.atMs;
  }
  return value.endMs < previousMs ? null : advanceGame(game, value.endMs - previousMs);
}
