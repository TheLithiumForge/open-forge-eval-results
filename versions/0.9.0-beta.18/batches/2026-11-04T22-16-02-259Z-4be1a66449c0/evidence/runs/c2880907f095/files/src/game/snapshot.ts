import { MAX_ELAPSED_MS, MAX_MOVES, MAX_SNAPSHOT_BYTES, MISMATCH_MS, SELECTION } from './constants.ts';
import { createGame } from './state.ts';
import type { GameState, Selection } from './types.ts';

const SNAPSHOT_VERSION = 1;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (byteLength(text) > MAX_SNAPSHOT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!record(value) || !exactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  const game = createGame(value.boardCode);
  if (!game || !record(value.selection)) return null;
  if (!safeInt(value.moves, MAX_MOVES) || !safeInt(value.elapsedMs, MAX_ELAPSED_MS) || typeof value.started !== 'boolean') return null;
  const matched = parseMatched(value.matched, game.board.deck.length);
  if (!matched) return null;
  if (new Set(matched).size !== matched.length || !containsWholePairs(matched, game.board.deck)) return null;
  const selection = parseSelection(value.selection, game.board.deck, matched);
  if (!selection) return null;
  const pairs = matched.length / 2;
  if (selection.kind === SELECTION.MISMATCH && value.moves < pairs + 1) return null;
  if (value.moves < pairs) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || pairs !== 0 || selection.kind !== SELECTION.CLOSED)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION.ONE) return null;
  if (pairs === game.board.deck.length / 2 && selection.kind !== SELECTION.CLOSED) return null;
  return { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}

function parseSelection(value: Record<string, unknown>, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (value.kind === SELECTION.CLOSED) return exactKeys(value, ['kind']) ? { kind: SELECTION.CLOSED } : null;
  if (value.kind === SELECTION.ONE) {
    if (!exactKeys(value, ['kind', 'index']) || !safeInt(value.index, deck.length - 1) || matched.includes(value.index)) return null;
    return { kind: SELECTION.ONE, index: value.index };
  }
  if (value.kind === SELECTION.MISMATCH) {
    if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) || !safeInt(value.first, deck.length - 1) || !safeInt(value.second, deck.length - 1)) return null;
    if (value.first === value.second || deck[value.first] === deck[value.second] || matched.includes(value.first) || matched.includes(value.second)) return null;
    if (!safeInt(value.remainingMs, MISMATCH_MS) || value.remainingMs === 0) return null;
    return { kind: SELECTION.MISMATCH, first: value.first, second: value.second, remainingMs: value.remainingMs };
  }
  return null;
}

function containsWholePairs(matched: readonly number[], deck: readonly number[]): boolean {
  const counts = new Map<number, number>();
  for (const index of matched) {
    const face = deck[index];
    if (face === undefined) return false;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2);
}

function parseMatched(value: unknown, deckLength: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const entries: readonly unknown[] = value;
  const matched: number[] = [];
  for (const index of entries) {
    if (!safeInt(index, deckLength - 1)) return null;
    matched.push(index);
  }
  return matched;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function safeInt(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
