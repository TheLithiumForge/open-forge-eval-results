import { exactKeys, isRecord, nonnegativeInteger, parseLimitedJson } from './formatValidation.ts';
import { readSelection } from './snapshotSelection.ts';
import { createGame, isWon } from './state.ts';
import type { GameState } from './state.ts';
import { MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_MAX_BYTES = 65_536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function readMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const candidates: readonly unknown[] = value;
  const matched: number[] = [];
  const faces = new Map<number, number>();
  for (const index of candidates) {
    if (!nonnegativeInteger(index, deck.length - 1) || matched.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
    matched.push(index);
  }
  return [...faces.values()].every((count) => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_MAX_BYTES);
  if (!isRecord(value) || !exactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !nonnegativeInteger(value.moves, MAX_MOVES) || !nonnegativeInteger(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched = readMatched(value.matched, game.deck);
  if (!matched) return null;
  const selection = readSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 ||
      selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  const restored = { ...game, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
  return isWon(restored) && selection.kind !== 'closed' ? null : restored;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch'
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
