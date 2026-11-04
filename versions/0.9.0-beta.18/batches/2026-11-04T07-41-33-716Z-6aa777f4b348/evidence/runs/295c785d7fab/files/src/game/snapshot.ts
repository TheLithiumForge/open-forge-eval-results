import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import type { GameState } from './state.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch'
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code, matched: state.matched,
    selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started,
  }, null, 2);
}

function decodeMatched(value: unknown, state: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const matched: number[] = [];
  for (const item of value) {
    if (!isNonnegativeInteger(item, state.deck.length - 1) || matched.includes(item)) return null;
    matched.push(item);
  }
  const counts = new Map<number, number>();
  for (const index of matched) {
    const face = state.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every(count => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, MAX_SNAPSHOT_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string' || typeof value.started !== 'boolean'
    || !isNonnegativeInteger(value.moves, MAX_MOVES)
    || !isNonnegativeInteger(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, initial, matched);
  if (!selection) return null;
  const state: GameState = { ...initial, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  const minimumMoves = matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0);
  if (state.moves < minimumMoves || (isWon(state) && selection.kind !== 'closed')) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (state.started && state.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
