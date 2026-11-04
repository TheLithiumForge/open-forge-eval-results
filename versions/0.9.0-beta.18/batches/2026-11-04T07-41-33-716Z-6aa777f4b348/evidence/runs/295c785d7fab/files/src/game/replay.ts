import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const MAX_REPLAY_BYTES = 1048576;
export const MAX_REPLAY_ACTIONS = 10000;
type ReplayAction = Readonly<{ atMs: number; index: number }>;

function decodeActions(value: unknown, state: GameState, endMs: number): readonly ReplayAction[] | null {
  if (!Array.isArray(value) || value.length > MAX_REPLAY_ACTIONS) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const action of value) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])
      || !isNonnegativeInteger(action.atMs) || action.atMs < previous || action.atMs > endMs
      || !isNonnegativeInteger(action.index, state.deck.length - 1)) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previous = action.atMs;
  }
  return actions;
}

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, MAX_REPLAY_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string'
    || !isNonnegativeInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  if (!state) return null;
  const actions = decodeActions(value.actions, state, value.endMs);
  if (!actions) return null;
  let previous = 0;
  for (const action of actions) {
    state = activateCard(advanceGame(state, action.atMs - previous), action.index);
    previous = action.atMs;
  }
  return advanceGame(state, value.endMs - previous);
}
