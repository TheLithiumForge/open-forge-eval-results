import { hasExactKeys, isRecord, parseLimitedJson } from './json.ts';
import { createGame, SELECTION_KINDS } from './state.ts';
import type { GameState } from './state.ts';
import { validateMatched, validateProgress, validateSelection } from './snapshotValidation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION_KINDS.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, KEYS) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string' || typeof value.started !== 'boolean'
    || typeof value.moves !== 'number' || typeof value.elapsedMs !== 'number') return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = validateMatched(value.matched, initial.deck);
  if (!matched) return null;
  const selection = validateSelection(value.selection, initial.deck, matched);
  if (!selection) return null;
  const state: GameState = {
    ...initial, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started,
  };
  return validateProgress(state) ? state : null;
}
