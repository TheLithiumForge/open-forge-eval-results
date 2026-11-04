import { hasKeys, isNatural, isRecord, parseJson } from './json.ts';
import { createGame, isWon, selectionKinds } from './state.ts';
import type { GameState } from './state.ts';
import { elapsedCap, moveCap } from './turn.ts';
import { decodeSelection } from './snapshot-selection.ts';

export const snapshotVersion = 1;
export const snapshotByteLimit = 65536;
const snapshotKeys = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === selectionKinds.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: snapshotVersion, boardCode: state.board.boardCode,
    matched: [...state.matched].sort((a, b) => a - b), selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

function decodeMatched(value: unknown, state: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const matched: number[] = [];
  for (const index of value) {
    if (!isNatural(index) || index >= state.board.deck.length || matched.includes(index)) return null;
    matched.push(index);
  }
  const counts = new Map<number, number>();
  for (const index of matched) {
    const face = state.board.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, snapshotByteLimit);
  if (!isRecord(value) || !hasKeys(value, snapshotKeys) || value.version !== snapshotVersion ||
    typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
    !isNatural(value.moves) || value.moves > moveCap ||
    !isNatural(value.elapsedMs) || value.elapsedMs > elapsedCap) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial);
  if (!matched) return null;
  const partial = { ...initial, matched };
  const selection = decodeSelection(value.selection, partial);
  if (!selection) return null;
  const state = { ...partial, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  const minimumMoves = matched.length / 2 + (selection.kind === selectionKinds.mismatch ? 1 : 0);
  if (state.moves < minimumMoves || (isWon(state) && selection.kind !== selectionKinds.closed)) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 ||
    selection.kind !== selectionKinds.closed)) return null;
  if (state.started && state.moves === 0 && selection.kind !== selectionKinds.one) return null;
  return state;
}
