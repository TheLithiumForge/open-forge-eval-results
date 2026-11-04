import { hasExactKeys, isRecord, isSafeNonnegative, parseLimitedJson } from './formatValidation.ts';
import { decodeMatched, decodeSelection } from './snapshotSelection.ts';
import { createGame, MAX_ELAPSED_MS, MAX_MOVES, SELECTION_KIND } from './state.ts';
import type { GameState } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION_KIND.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
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
  const value = parseLimitedJson(text, MAX_SNAPSHOT_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) ||
      value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  const game = createGame(value.boardCode);
  if (!game || typeof value.started !== 'boolean' ||
      !isSafeNonnegative(value.moves) || value.moves > MAX_MOVES ||
      !isSafeNonnegative(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  const matched = decodeMatched(value.matched, game);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === SELECTION_KIND.mismatch ? 1 : 0)) return null;
  if (matched.length === game.board.deck.length && selection.kind !== SELECTION_KIND.closed) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION_KIND.one) return null;
  return { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}
