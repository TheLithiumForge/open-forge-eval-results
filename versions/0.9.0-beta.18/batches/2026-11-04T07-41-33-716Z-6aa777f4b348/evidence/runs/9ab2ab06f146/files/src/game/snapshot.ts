import { createGame, KIND, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';
import { decodeMatched, decodeSelection } from './snapshot-selection.ts';
import { exactKeys, integer, isRecord, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;
const FIELDS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code, matched: state.matched,
    selection: state.selection, moves: state.moves, elapsedMs: state.elapsedMs, started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTES);
  if (!isRecord(value) || !exactKeys(value, FIELDS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !integer(value.moves, MAX_MOVES) || !integer(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial.board.deck);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, initial.board.deck, matched);
  if (!selection || (matched.length === initial.board.deck.length && selection.kind !== KIND.closed)) return null;
  const minimumMoves = matched.length / 2 + (selection.kind === KIND.mismatch ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== KIND.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== KIND.one) return null;
  return { ...initial, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}
