import { createGame, isWon, MOVE_CAP, TIME_CAP } from './state.ts';
import type { GameState } from './state.ts';
import { decodeSelection } from './selection.ts';
import { hasKeys, isInteger, isRecord, parseJSON } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: [...state.matched].sort((a, b) => a - b), selection: state.selection,
    moves: state.moves, elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJSON(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasKeys(value,
    ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) ||
    value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string' ||
    typeof value.started !== 'boolean' || !isInteger(value.moves, MOVE_CAP) ||
    !isInteger(value.elapsedMs, TIME_CAP) || !Array.isArray(value.matched)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!isInteger(index, initial.board.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = initial.board.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const base: GameState = { ...initial, matched, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
  const selection = decodeSelection(value.selection, base);
  if (!selection) return null;
  const state: GameState = { ...base, selection };
  if (isWon(state) && selection.kind !== 'closed') return null;
  const minimumMoves = matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0);
  if (state.moves < minimumMoves) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 ||
    matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (state.started && state.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
