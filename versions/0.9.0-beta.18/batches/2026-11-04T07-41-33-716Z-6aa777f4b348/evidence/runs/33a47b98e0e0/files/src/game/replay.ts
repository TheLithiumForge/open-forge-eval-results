import { createGame, type GameState } from './state.ts';
import { advanceGame, activateCard } from './transitions.ts';
import { hasExactKeys, isIndex, isRecord, isSafeCount, parseJson } from './formatValidation.ts';

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1_048_576;
export const REPLAY_ACTION_LIMIT = 10_000;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

interface ReplayDocument {
  readonly boardCode: string;
  readonly actions: readonly ReplayAction[];
  readonly endMs: number;
}

function parseReplay(text: string): ReplayDocument | null {
  const value = parseJson(text, REPLAY_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !Array.isArray(value.actions)) return null;
  if (value.actions.length > REPLAY_ACTION_LIMIT || !isSafeCount(value.endMs)) return null;
  const actions: ReplayAction[] = [];
  let previousAt = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !hasExactKeys(item, ['atMs', 'index'])) return null;
    if (!isSafeCount(item.atMs) || !isSafeCount(item.index) || item.atMs < previousAt) return null;
    actions.push(Object.freeze({ atMs: item.atMs, index: item.index }));
    previousAt = item.atMs;
  }
  if (actions.length > 0 && value.endMs < previousAt) return null;
  return Object.freeze({ boardCode: value.boardCode, actions: Object.freeze(actions), endMs: value.endMs });
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (replay === null) return null;
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let currentAt = 0;
  for (const action of replay.actions) {
    if (!isIndex(action.index, state.deck.length)) return null;
    state = advanceGame(state, action.atMs - currentAt);
    state = activateCard(state, action.index);
    currentAt = action.atMs;
  }
  state = advanceGame(state, replay.endMs - currentAt);
  return state;
}
