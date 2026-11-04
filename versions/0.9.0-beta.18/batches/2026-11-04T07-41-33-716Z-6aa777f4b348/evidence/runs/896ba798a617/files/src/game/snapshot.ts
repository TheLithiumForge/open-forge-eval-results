import { MAX_MOVES } from './activateCard.ts';
import { MAX_ELAPSED_MS } from './advanceGame.ts';
import { hasExactKeys, isRecord, isSafeInteger, parseFormatJson } from './formatInput.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { createGame, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
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
  const entries: readonly unknown[] = value;
  const matched: number[] = [];
  const faces = new Map<number, number>();
  for (const index of entries) {
    if (!isSafeInteger(index, state.deck.length - 1) || matched.includes(index)) return null;
    const face = state.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
    matched.push(index);
  }
  return [...faces.values()].every((count) => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseFormatJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string' || typeof value.started !== 'boolean'
    || !isSafeInteger(value.moves, MAX_MOVES) || !isSafeInteger(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = decodeMatched(value.matched, initial);
  if (!matched) return null;
  const partial = { ...initial, matched };
  const selection = decodeSelection(value.selection, partial);
  if (!selection) return null;
  const state = {
    ...partial, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started,
  };
  const requiredMoves = pairCount(state) + (selection.kind === 'mismatch' ? 1 : 0);
  if (state.moves < requiredMoves || (isWon(state) && selection.kind !== 'closed')) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0
    || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (state.started && state.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
