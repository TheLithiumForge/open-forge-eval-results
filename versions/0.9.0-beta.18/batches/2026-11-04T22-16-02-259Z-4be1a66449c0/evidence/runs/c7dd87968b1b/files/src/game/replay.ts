import { parseBoardCode } from './board/boardCode.ts';
import { createGame } from './createGame.ts';
import { advanceGame, activateCard } from './transitions.ts';
import type { GameState } from './types.ts';

type ReplayAction = Readonly<{ atMs: number; index: number }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(text: string): { code: string; actions: ReplayAction[]; endMs: number } | null {
  if (new TextEncoder().encode(text).byteLength > 1_048_576) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (value.version !== 1 || typeof value.boardCode !== 'string' || !parseBoardCode(value.boardCode)) return null;
  if (!Array.isArray(value.actions) || value.actions.length > 10_000 || !safeInteger(value.endMs)) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (let i = 0; i < value.actions.length; i += 1) {
    const action: unknown = value.actions[i];
    if (!isRecord(action) || !exactKeys(action, ['atMs', 'index']) || !safeInteger(action.atMs) || !safeInteger(action.index)) return null;
    if (i > 0 && action.atMs < previous) return null;
    previous = action.atMs;
    actions.push({ atMs: action.atMs, index: action.index });
  }
  if (actions.length > 0 && value.endMs < previous) return null;
  const board = createGame(value.boardCode);
  if (!board || actions.some((action) => action.index >= board.board.deck.length)) return null;
  return { code: board.board.boardCode, actions, endMs: value.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (!replay) return null;
  let state = createGame(replay.code);
  if (!state) return null;
  let previous = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - previous);
    state = activateCard(state, action.index);
    previous = action.atMs;
  }
  state = advanceGame(state, replay.endMs - previous);
  return state;
}
