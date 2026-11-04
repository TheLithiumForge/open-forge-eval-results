import { createGame, isWon, SELECTION } from './state.ts';
import type { GameState } from './state.ts';
import { decodeMatched, decodeSelection } from './snapshotSelection.ts';
import { MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { exactKeys, isNonnegativeInteger, isObject, parseLimitedJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
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
  if (!isObject(value) || !exactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isNonnegativeInteger(value.moves) || value.moves > MAX_MOVES ||
      !isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched = decodeMatched(value.matched, game);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (!selection) return null;
  const state: GameState = { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  if (isWon(state) && selection.kind !== SELECTION.closed) return null;
  const requiredMoves = matched.length / 2 + (selection.kind === SELECTION.mismatch ? 1 : 0);
  if (state.moves < requiredMoves) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION.closed)) return null;
  if (state.started && state.moves === 0 && selection.kind !== SELECTION.one) return null;
  return state;
}
