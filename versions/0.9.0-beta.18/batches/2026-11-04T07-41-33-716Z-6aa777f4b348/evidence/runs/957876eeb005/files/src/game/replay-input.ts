import { createGame } from './create-game.ts';
import { hasExactKeys, isNonnegativeInteger, isPosition, isRecord, parseJson } from './json-input.ts';
import type { GameState } from './state.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

export interface ReplayAction { readonly atMs: number; readonly index: number }
interface Replay { readonly initial: GameState; readonly actions: readonly ReplayAction[]; readonly endMs: number }

export function decodeReplay(text: string): Replay | null {
  const value = parseJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs']) ||
      value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' ||
      !isNonnegativeInteger(value.endMs) || !Array.isArray(value.actions) ||
      value.actions.length > REPLAY_ACTION_LIMIT) return null;
  const initial = createGame(value.boardCode);
  if (initial === null) return null;
  const actions: ReplayAction[] = [];
  const candidates: readonly unknown[] = value.actions;
  let previous = 0;
  for (const action of candidates) {
    if (!isRecord(action) || !hasExactKeys(action, ['atMs', 'index']) ||
        !isNonnegativeInteger(action.atMs) || action.atMs < previous ||
        !isPosition(action.index, initial.deck.length)) return null;
    previous = action.atMs;
    actions.push({ atMs: action.atMs, index: action.index });
  }
  return value.endMs >= previous ? { initial, actions, endMs: value.endMs } : null;
}
