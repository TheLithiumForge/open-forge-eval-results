import { parseBoardCode } from './boardCode.ts';
import { hasExactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './formatInput.ts';
import { SELECTION } from './selection.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';
import type { GameState } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: [...state.matched].sort((first, second) => first - second),
    selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started,
  }, null, 2);
}

function decodeMatched(value: unknown, state: GameState): readonly number[] | null {
  if (!Array.isArray(value) || value.length > state.board.deck.length) return null;
  const matched: number[] = [];
  const faces = new Map<number, number>();
  for (const index of value) {
    if (!isNonnegativeInteger(index) || index >= state.board.deck.length || matched.includes(index)) return null;
    const face = state.board.deck[index];
    if (face === undefined) return null;
    matched.push(index);
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  return [...faces.values()].every((count) => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS)) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  if (!parseBoardCode(value.boardCode)) return null;
  if (!isNonnegativeInteger(value.moves) || value.moves > MAX_MOVES) return null;
  if (!isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  if (typeof value.started !== 'boolean') return null;
  const initial = createGame(value.boardCode);
  const matched = decodeMatched(value.matched, initial);
  if (!matched) return null;
  const state = { ...initial, matched, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  const selection = decodeSelection(value.selection, state);
  if (!selection) return null;
  const result = { ...state, selection };
  if (result.moves < pairCount(result) + (selection.kind === SELECTION.mismatch ? 1 : 0)) return null;
  if (!result.started && (result.moves !== 0 || result.elapsedMs !== 0
    || matched.length !== 0 || selection.kind !== SELECTION.closed)) return null;
  if (result.started && result.moves === 0 && selection.kind !== SELECTION.one) return null;
  if (isWon(result) && selection.kind !== SELECTION.closed) return null;
  return result;
}
