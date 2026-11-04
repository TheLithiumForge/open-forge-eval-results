import { hasExactKeys, isNonnegativeSafeInteger, parseLimitedJson } from './formats.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { createGame, isWon, SELECTION_KINDS } from './state.ts';
import type { GameState } from './state.ts';
import { MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function decodeMatched(value: unknown, game: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const entries: readonly unknown[] = value;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of entries) {
    if (!isNonnegativeSafeInteger(index) || index >= game.board.deck.length
      || matched.includes(index)) return null;
    const face = game.board.deck[index];
    if (face === undefined) return null;
    matched.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2) ? matched : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string') return null;
  const game = createGame(value.boardCode);
  if (!game || typeof value.started !== 'boolean'
    || !isNonnegativeSafeInteger(value.moves) || value.moves > MAX_MOVES
    || !isNonnegativeSafeInteger(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS) return null;
  const matched = decodeMatched(value.matched, game);
  if (!matched) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (!selection) return null;
  const requiredMoves = matched.length / 2 + (selection.kind === SELECTION_KINDS.mismatch ? 1 : 0);
  if (value.moves < requiredMoves) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0
    || selection.kind !== SELECTION_KINDS.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION_KINDS.one) return null;
  const restored: GameState = {
    ...game, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started,
  };
  if (isWon(restored) && selection.kind !== SELECTION_KINDS.closed) return null;
  return restored;
}

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
