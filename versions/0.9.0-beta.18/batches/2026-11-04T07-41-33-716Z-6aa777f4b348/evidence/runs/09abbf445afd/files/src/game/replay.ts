import {
  MAX_ELAPSED_MS,
  MAX_REPLAY_ACTIONS,
  MAX_REPLAY_BYTES,
  REPLAY_VERSION,
} from './constants.ts';
import { activateCard, advanceGame, createGame } from './transitions.ts';
import type { GameState } from './types.ts';

type ReplayAction = Readonly<{ atMs: number; index: number }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function safeTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(text: string): Readonly<{ state: GameState; actions: readonly ReplayAction[]; endMs: number }> | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !isUnknownArray(value.actions)) return null;
  if (value.actions.length > MAX_REPLAY_ACTIONS || !safeTime(value.endMs)) return null;
  const state = createGame(value.boardCode);
  if (state === null) return null;
  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const action of value.actions) {
    if (!isRecord(action) || !exactKeys(action, ['atMs', 'index'])) return null;
    if (!safeTime(action.atMs) || !safeTime(action.index) || action.index >= state.board.deck.length) return null;
    if (action.atMs < previousTime || action.atMs > value.endMs) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previousTime = action.atMs;
  }
  return { state, actions, endMs: value.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (replay === null) return null;
  let state = replay.state;
  let cursor = 0;
  for (const action of replay.actions) {
    const delta = action.atMs - cursor;
    state = advanceGame(state, delta);
    state = activateCard(state, action.index);
    cursor = action.atMs;
  }
  state = advanceGame(state, replay.endMs - cursor);
  if (state.elapsedMs > MAX_ELAPSED_MS) return null;
  return state;
}
