import { createGame, isWon } from './state.ts';
import type { GameState } from './state.ts';
import { exact, object, readSelection, validMatched, validProgress } from './snapshotValidation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch'
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > SNAPSHOT_BYTE_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!object(value) || !exact(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) ||
        value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
    const state = createGame(value.boardCode);
    if (!state || !validMatched(value.matched, state)) return null;
    const selection = readSelection(value.selection, state, value.matched);
    if (!selection || !validProgress(value, value.matched, selection) ||
        typeof value.moves !== 'number' || typeof value.elapsedMs !== 'number' || typeof value.started !== 'boolean') return null;
    const restored: GameState = { ...state, matched: value.matched, selection,
      moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
    return isWon(restored) && selection.kind !== 'closed' ? null : restored;
  } catch { return null; }
}
