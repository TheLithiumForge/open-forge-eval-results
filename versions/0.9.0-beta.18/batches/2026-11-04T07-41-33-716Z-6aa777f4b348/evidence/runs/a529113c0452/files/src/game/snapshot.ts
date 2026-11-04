import { SELECTION } from './selection.ts';
import { decodeSelection } from './snapshotSelection.ts';
import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { hasExactKeys, isInteger, isRecord, parseLimitedJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_MAX_BYTES = 65_536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

function decodeMatched(value: unknown, game: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const positions: number[] = [];
  for (const position of value) {
    if (!isInteger(position, game.board.deck.length - 1) || positions.includes(position)) return null;
    positions.push(position);
  }
  const counts = new Map<number, number>();
  for (const position of positions) {
    const face = game.board.deck[position];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2) ? Object.freeze(positions) : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_MAX_BYTES);
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string' || typeof value.started !== 'boolean'
    || !isInteger(value.moves, MAX_MOVES) || !isInteger(value.elapsedMs, MAX_ELAPSED_MS)) return null;
  const game = createGame(value.boardCode);
  if (game === null) return null;
  const matched = decodeMatched(value.matched, game);
  if (matched === null) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (selection === null) return null;
  const restored = Object.freeze({ ...game, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started });
  const minimumMoves = pairCount(restored) + (selection.kind === SELECTION.mismatch ? 1 : 0);
  if (restored.moves < minimumMoves || (isWon(restored) && selection.kind !== SELECTION.closed)) return null;
  if (!restored.started && (restored.moves !== 0 || restored.elapsedMs !== 0
    || matched.length !== 0 || selection.kind !== SELECTION.closed)) return null;
  if (restored.started && restored.moves === 0 && selection.kind !== SELECTION.one) return null;
  return restored;
}
