import { MOVE_CAP } from './activate-card.ts';
import { ELAPSED_CAP } from './advance-game.ts';
import { createGame } from './create-game.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseJson } from './json-input.ts';
import { SELECTION_KINDS } from './selection.ts';
import { decodeMatched } from './snapshot-matched.ts';
import { decodeSelection } from './snapshot-selection.ts';
import type { GameState } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

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
  const value = parseJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isNonnegativeInteger(value.moves) || value.moves > MOVE_CAP ||
      !isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > ELAPSED_CAP) return null;
  const initial = createGame(value.boardCode);
  if (initial === null) return null;
  const matched = decodeMatched(value.matched, initial.deck);
  if (matched === null) return null;
  const selection = decodeSelection(value.selection, initial.deck, matched);
  if (selection === null) return null;
  const minimumMoves = matched.length / 2 + (selection.kind === SELECTION_KINDS.mismatch ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  if (matched.length === initial.deck.length && selection.kind !== SELECTION_KINDS.closed) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 ||
      selection.kind !== SELECTION_KINDS.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION_KINDS.one) return null;
  return { ...initial, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}
