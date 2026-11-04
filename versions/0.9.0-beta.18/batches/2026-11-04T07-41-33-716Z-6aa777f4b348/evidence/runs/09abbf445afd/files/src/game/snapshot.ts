import {
  MAX_ELAPSED_MS,
  MAX_MOVES,
  MAX_SNAPSHOT_BYTES,
  MISMATCH_DURATION_MS,
  SNAPSHOT_VERSION,
  SELECTION_KIND,
} from './constants.ts';
import { createGame } from './transitions.ts';
import type { GameState, Selection } from './types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function isSafeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function selectionFrom(value: unknown, state: GameState, matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  const length = state.board.deck.length;
  const validUnmatched = (index: unknown): index is number =>
    isSafeCount(index) && index < length && !matched.has(index);
  if (value.kind === SELECTION_KIND.CLOSED && hasExactKeys(value, ['kind'])) return { kind: SELECTION_KIND.CLOSED };
  if (value.kind === SELECTION_KIND.ONE && hasExactKeys(value, ['kind', 'index']) && validUnmatched(value.index)) {
    return { kind: SELECTION_KIND.ONE, index: value.index };
  }
  if (
    value.kind === SELECTION_KIND.MISMATCH &&
    hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
    validUnmatched(value.first) && validUnmatched(value.second) &&
    value.first !== value.second &&
    state.board.deck[value.first] !== state.board.deck[value.second] &&
    isSafeCount(value.remainingMs) &&
    value.remainingMs >= 1 &&
    value.remainingMs <= MISMATCH_DURATION_MS
  ) {
    return { kind: SELECTION_KIND.MISMATCH, first: value.first, second: value.second, remainingMs: value.remainingMs };
  }
  return null;
}

function matchedPositions(value: unknown, state: GameState): readonly number[] | null {
  if (!isUnknownArray(value)) return null;
  const positions = new Set<number>();
  const faceCounts = new Map<number, number>();
  for (const index of value) {
    if (!isSafeCount(index) || index >= state.board.deck.length || positions.has(index)) return null;
    const face = state.board.deck[index];
    if (face === undefined) return null;
    positions.add(index);
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null;
  return [...positions];
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) {
    return null;
  }
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  const initial = createGame(value.boardCode);
  if (initial === null) return null;
  const matched = matchedPositions(value.matched, initial);
  if (matched === null || !isSafeCount(value.moves) || value.moves > MAX_MOVES) return null;
  if (!isSafeCount(value.elapsedMs) || value.elapsedMs > MAX_ELAPSED_MS || typeof value.started !== 'boolean') return null;
  const matchedSet = new Set(matched);
  const selection = selectionFrom(value.selection, initial, matchedSet);
  if (selection === null) return null;
  const matchedPairs = matched.length / 2;
  const completed = matched.length === initial.board.deck.length;
  if (completed && selection.kind !== SELECTION_KIND.CLOSED) return null;
  if (value.moves < matchedPairs || (selection.kind === SELECTION_KIND.MISMATCH && value.moves < matchedPairs + 1)) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.CLOSED)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION_KIND.ONE) return null;
  return Object.freeze({
    ...initial,
    matched: Object.freeze(matched),
    selection: Object.freeze(selection),
    moves: value.moves,
    elapsedMs: value.elapsedMs,
    started: value.started,
  });
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION_KIND.MISMATCH
    ? {
        kind: 'mismatch',
        first: state.selection.first,
        second: state.selection.second,
        remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)),
      }
    : state.selection;
  const snapshot = {
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: [...state.matched],
    selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started,
  };
  return JSON.stringify(snapshot, null, 2);
}

