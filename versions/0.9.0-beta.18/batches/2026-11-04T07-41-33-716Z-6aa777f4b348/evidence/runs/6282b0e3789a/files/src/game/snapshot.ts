import { createGame } from './createGame.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, isUnknownArray, parseLimitedJSON } from './jsonInput.ts';
import { decodeSelection, isPosition } from './snapshotSelection.ts';
import { isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';
import type { GameState, Selection } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function decodeMatched(value: unknown, state: GameState): readonly number[] | null {
  if (!isUnknownArray(value)) return null;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of value) {
    if (!isPosition(index, state.deck.length) || matched.includes(index)) return null;
    const face = state.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
    matched.push(index);
  }
  return [...counts.values()].every(count => count === 2) ? matched : null;
}

function hasConsistentProgress(state: GameState): boolean {
  const requiredMoves = pairCount(state) + (state.selection.kind === 'mismatch' ? 1 : 0);
  if (state.moves < requiredMoves || (isWon(state) && state.selection.kind !== 'closed')) return false;
  if (!state.started) {
    return state.moves === 0 && state.elapsedMs === 0 && state.matched.length === 0 && state.selection.kind === 'closed';
  }
  return state.moves !== 0 || state.selection.kind === 'one';
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJSON(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isNonnegativeInteger(value.moves) || value.moves > MAX_MOVES ||
      !isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, { ...initial, matched });
  if (!selection) return null;
  const state: GameState = {
    ...initial, matched, selection,
    moves: value.moves, elapsedMs: value.elapsedMs, started: value.started,
  };
  return hasConsistentProgress(state) ? state : null;
}

export function encodeSnapshot(state: GameState): string {
  const selection: Selection = state.selection.kind === 'mismatch'
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
