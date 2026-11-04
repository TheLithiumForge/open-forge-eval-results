import { REPLAY_ACTION_LIMIT, REPLAY_BYTE_LIMIT } from '../constants.ts';
import { activateCard, advanceGame, createGame, type GameState } from '../core.ts';

const REPLAY_VERSION = 1;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function replayData(value: unknown): { boardCode: string; actions: ReplayAction[]; endMs: number } | null {
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !Array.isArray(value.actions)) return null;
  if (value.actions.length > REPLAY_ACTION_LIMIT || !Number.isSafeInteger(value.endMs) || (value.endMs as number) < 0) return null;
  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !exactKeys(item, ['atMs', 'index'])) return null;
    if (!Number.isSafeInteger(item.atMs) || (item.atMs as number) < 0) return null;
    if (!Number.isSafeInteger(item.index) || (item.index as number) < 0) return null;
    const atMs = item.atMs as number;
    const index = item.index as number;
    if (actions.length > 0 && atMs < previousTime) return null;
    previousTime = atMs;
    actions.push({ atMs, index });
  }
  if (actions.length > 0 && (value.endMs as number) < previousTime) return null;
  return { boardCode: value.boardCode, actions, endMs: value.endMs as number };
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_BYTE_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { return null; }
  const data = replayData(value);
  if (data === null) return null;
  let state = createGame(data.boardCode);
  if (state === null) return null;
  let timeline = 0;
  for (const action of data.actions) {
    if (action.index >= state.deck.length) return null;
    state = advanceGame(state, action.atMs - timeline);
    timeline = action.atMs;
    state = activateCard(state, action.index);
  }
  state = advanceGame(state, data.endMs - timeline);
  return state;
}
