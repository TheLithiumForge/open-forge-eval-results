import { MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES } from './constants.ts';
import { advanceGame, activateCard, createGame } from './state.ts';
import type { GameState } from './types.ts';

const REPLAY_VERSION = 1;

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > MAX_REPLAY_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!record(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== REPLAY_VERSION || typeof value.boardCode !== 'string' || !safeInt(value.endMs)) return null;
  if (!Array.isArray(value.actions) || value.actions.length > MAX_REPLAY_ACTIONS) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const actions: readonly unknown[] = value.actions;
  let state = game;
  let time = 0;
  for (const entry of actions) {
    if (!record(entry) || !exactKeys(entry, ['atMs', 'index']) || !safeInt(entry.atMs) || !safeInt(entry.index)) return null;
    if (entry.index >= game.board.deck.length || entry.atMs < time || entry.atMs > value.endMs) return null;
    state = advanceGame(state, entry.atMs - time);
    state = activateCard(state, entry.index);
    time = entry.atMs;
  }
  return advanceGame(state, value.endMs - time);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function safeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
