import { parseBoardCode } from './boardCode.ts';
import { createGame, MAX_ELAPSED_MS, MAX_MOVES } from './game.ts';
import { decodeMatched, decodeSelection } from './snapshotFields.ts';
import { isWon, selectionKinds } from './state.ts';
import type { GameState } from './state.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const snapshotKeys = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === selectionKinds.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: [...state.matched].sort((first, second) => first - second), selection,
    moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, snapshotKeys)
    || value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string'
    || !parseBoardCode(value.boardCode) || typeof value.started !== 'boolean'
    || !isNonnegativeInteger(value.moves) || value.moves > MAX_MOVES
    || !isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  const initial = createGame(value.boardCode);
  const matched = decodeMatched(value.matched, initial.deck);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, initial.deck, matched);
  if (!selection) return null;
  const state: GameState = {
    ...initial, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started,
  };
  const pendingMove = selection.kind === selectionKinds.mismatch ? 1 : 0;
  if (state.moves < matched.length / 2 + pendingMove) return null;
  if (isWon(state) && selection.kind !== selectionKinds.closed) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0
    || matched.length !== 0 || selection.kind !== selectionKinds.closed)) return null;
  if (state.started && state.moves === 0 && selection.kind !== selectionKinds.one) return null;
  return state;
}
