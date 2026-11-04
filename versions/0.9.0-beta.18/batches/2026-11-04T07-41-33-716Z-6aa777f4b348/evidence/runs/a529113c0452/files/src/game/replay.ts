import { activateCard, advanceGame, createGame } from './state.ts';
import type { GameState } from './state.ts';
import { hasExactKeys, isInteger, isRecord, parseLimitedJson } from './validation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_MAX_BYTES = 1_048_576;
export const REPLAY_MAX_ACTIONS = 10_000;
type ReplayAction = Readonly<{ atMs: number; index: number }>;

function decodeActions(value: unknown, cardCount: number, endMs: number): readonly ReplayAction[] | null {
  if (!Array.isArray(value) || value.length > REPLAY_MAX_ACTIONS) return null;
  const actions: ReplayAction[] = [];
  let previousMs = 0;
  for (const action of value) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index'])
      || !isInteger(action.atMs) || !isInteger(action.index, cardCount - 1)
      || action.atMs < previousMs || action.atMs > endMs) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previousMs = action.atMs;
  }
  return actions;
}

export function replayGame(text: string): GameState | null {
  const value = parseLimitedJson(text, REPLAY_MAX_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])
    || value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !isInteger(value.endMs)) return null;
  let state = createGame(value.boardCode);
  if (state === null) return null;
  const actions = decodeActions(value.actions, state.board.deck.length, value.endMs);
  if (actions === null) return null;
  let atMs = 0;
  for (const action of actions) {
    state = activateCard(advanceGame(state, action.atMs - atMs), action.index);
    atMs = action.atMs;
  }
  return advanceGame(state, value.endMs - atMs);
}
