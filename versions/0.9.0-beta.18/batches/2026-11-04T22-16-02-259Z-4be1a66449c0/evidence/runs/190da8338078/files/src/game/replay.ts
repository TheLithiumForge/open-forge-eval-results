import { createGame, activateCard, advanceGame } from './transition.ts';
import type { GameState } from './types.ts';

export const REPLAY_BYTE_LIMIT = 1_048_576;
export const REPLAY_ACTION_LIMIT = 10_000;

type ReplayAction = Readonly<{ atMs: number; index: number }>;

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_BYTE_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'actions', 'endMs']) || value.version !== 1 || typeof value.boardCode !== 'string') return null;
  if (!Array.isArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT || !safeTime(value.endMs)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !hasKeys(item, ['atMs', 'index']) || !safeTime(item.atMs) || !safeTime(item.index) || item.index >= game.board.deck.length || item.atMs < previous) return null;
    actions.push(Object.freeze({ atMs: item.atMs, index: item.index }));
    previous = item.atMs;
  }
  if (actions.length > 0 && value.endMs < previous) return null;
  let state = game;
  let timeline = 0;
  for (const action of actions) {
    state = advanceGame(state, action.atMs - timeline);
    state = activateCard(state, action.index);
    timeline = action.atMs;
  }
  return advanceGame(state, value.endMs - timeline);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function safeTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
