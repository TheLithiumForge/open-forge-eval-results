import { CLOSED, MOVE_CAP, TIME_CAP_MS, type GameState, type Selection } from './types.ts';
import { createGame, isWon, pairCount } from './transition.ts';

export const SNAPSHOT_BYTE_LIMIT = 65_536;

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'closed'
    ? { kind: 'closed' }
    : state.selection.kind === 'one'
      ? { kind: 'one', index: state.selection.index }
      : { kind: 'mismatch', first: state.selection.first, second: state.selection.second, remainingMs: state.selection.remainingMs };
  return JSON.stringify({ version: 1, boardCode: state.board.code, matched: state.matched, selection, moves: state.moves, elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (utf8Length(text) > SNAPSHOT_BYTE_LIMIT) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null;
  if (value.version !== 1 || typeof value.boardCode !== 'string' || !Array.isArray(value.matched)) return null;
  const base = createGame(value.boardCode);
  if (!base || !isNonnegativeSafeInt(value.moves) || value.moves > MOVE_CAP || !isNonnegativeSafeInt(value.elapsedMs) || value.elapsedMs > TIME_CAP_MS || typeof value.started !== 'boolean') return null;
  const matched = readMatched(value.matched, base.board.deck);
  const selection = readSelection(value.selection, base);
  if (!matched || !selection || !validProgress(value.started, value.moves, value.elapsedMs, matched, selection, base)) return null;
  return Object.freeze({ ...base, matched: Object.freeze(matched), selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started });
}

function readMatched(items: unknown[], deck: readonly number[]): number[] | null {
  const seen = new Set<number>();
  for (const item of items) {
    if (!isIndex(item, deck.length) || seen.has(item)) return null;
    seen.add(item);
  }
  for (const face of new Set(deck)) {
    const count = [...seen].filter((position) => deck[position] === face).length;
    if (count !== 0 && count !== 2) return null;
  }
  return [...seen];
}

function readSelection(value: unknown, state: GameState): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'closed' && hasKeys(value, ['kind'])) return CLOSED;
  if (value.kind === 'one' && hasKeys(value, ['kind', 'index']) && isIndex(value.index, state.board.deck.length)) {
    return Object.freeze({ kind: 'one', index: value.index });
  }
  if (value.kind === 'mismatch' && hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
    isIndex(value.first, state.board.deck.length) && isIndex(value.second, state.board.deck.length) &&
    value.first !== value.second && state.board.deck[value.first] !== state.board.deck[value.second] &&
    isNonnegativeSafeInt(value.remainingMs) && value.remainingMs >= 1 && value.remainingMs <= 800) {
    return Object.freeze({ kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs });
  }
  return null;
}

function validProgress(started: boolean, moves: number, elapsed: number, matched: number[], selection: Selection, base: GameState): boolean {
  if (matched.some((index) => selection.kind === 'one' ? index === selection.index : selection.kind === 'mismatch' && (index === selection.first || index === selection.second))) return false;
  const pairs = matched.length / 2;
  if (moves < pairs || selection.kind === 'mismatch' && moves < pairs + 1) return false;
  if (isWon({ ...base, matched, selection }) && selection.kind !== 'closed') return false;
  if (!started) return moves === 0 && elapsed === 0 && matched.length === 0 && selection.kind === 'closed';
  if (moves === 0) return selection.kind === 'one' && matched.length === 0;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function isNonnegativeSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function isIndex(value: unknown, length: number): value is number {
  return isNonnegativeSafeInt(value) && value < length;
}
function utf8Length(text: string): number { return new TextEncoder().encode(text).byteLength; }
