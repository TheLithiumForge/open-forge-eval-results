import { hasExactKeys, isObject, isSafeInteger, parseLimitedJson } from './json.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, selectionKinds } from './state.ts';
import type { GameState, Selection } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const snapshotKeys = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection: Selection = state.selection.kind === selectionKinds.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

function decodeMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const indices: readonly unknown[] = value;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of indices) {
    if (!isSafeInteger(index, deck.length - 1) || matched.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    matched.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isObject(value) || !hasExactKeys(value, snapshotKeys) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isSafeInteger(value.moves, MAX_MOVES) || !isSafeInteger(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial.deck);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, initial.deck, matched);
  if (!selection) return null;
  const state: GameState = { ...initial, matched, selection,
    moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  const minimumMoves = matched.length / 2 + Number(selection.kind === selectionKinds.mismatch);
  if (state.moves < minimumMoves || (isWon(state) && selection.kind !== selectionKinds.closed)) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 ||
      selection.kind !== selectionKinds.closed)) return null;
  if (state.started && state.moves === 0 && selection.kind !== selectionKinds.one) return null;
  return state;
}
