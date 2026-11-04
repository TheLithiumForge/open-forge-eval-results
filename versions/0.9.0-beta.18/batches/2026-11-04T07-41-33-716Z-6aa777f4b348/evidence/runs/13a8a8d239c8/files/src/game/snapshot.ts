import { parseBoardCode } from './board.ts';
import { hasExactKeys, isRecord, isUnknownArray } from './format-validation.ts';
import type { GameState, Selection } from './state.ts';
import { initialGame, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KIND } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65_536;

type SnapshotObject = {
  readonly version: 1;
  readonly boardCode: string;
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
};

export function encodeSnapshot(state: GameState): string {
  const value: SnapshotObject = {
    version: SNAPSHOT_VERSION,
    boardCode: state.board.boardCode,
    matched: state.matched,
    selection: state.selection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  };
  return JSON.stringify(value);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > SNAPSHOT_BYTE_LIMIT) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  return readSnapshot(value);
}

function readSnapshot(value: unknown): GameState | null {
  if (!hasExactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) {
    return null;
  }
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  if (!isUnknownArray(value.matched) || !isSafeCount(value.moves, MAX_MOVES)) return null;
  if (!isSafeCount(value.elapsedMs, MAX_ELAPSED_MS) || typeof value.started !== 'boolean') return null;

  const board = parseBoardCode(value.boardCode);
  if (board === null) return null;
  const matched = readMatched(value.matched, board.deck);
  if (matched === null) return null;
  const selection = readSelection(value.selection, board.deck, matched);
  if (selection === null) return null;

  const pairCount = matched.length / 2;
  const minimumMoves = pairCount + (selection.kind === SELECTION_KIND.mismatch ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  const complete = matched.length === board.deck.length;
  if (complete && selection.kind !== SELECTION_KIND.closed) return null;
  if (!value.started) {
    if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.closed) {
      return null;
    }
  } else if (value.moves === 0 && selection.kind !== SELECTION_KIND.one) {
    return null;
  }

  const game = initialGame(board);
  return { ...game, matched: Object.freeze(matched), selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}

function readMatched(value: readonly unknown[], deck: readonly number[]): number[] | null {
  const matched: number[] = [];
  for (const index of value) {
    if (!isIndex(index, deck.length) || matched.includes(index)) return null;
    matched.push(index);
  }
  const matchedSet = new Set(matched);
  for (const index of matched) {
    const face = deck[index];
    if (face === undefined) return null;
    const partner = deck.findIndex((candidate, position) => candidate === face && position !== index);
    if (partner < 0 || !matchedSet.has(partner)) return null;
  }
  return matched;
}

function readSelection(value: unknown, deck: readonly number[], matched: readonly number[]): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === SELECTION_KIND.closed) {
    return hasExactKeys(value, ['kind']) ? { kind: SELECTION_KIND.closed } : null;
  }
  if (value.kind === SELECTION_KIND.one) {
    if (!hasExactKeys(value, ['kind', 'index']) || !isIndex(value.index, deck.length) || matched.includes(value.index)) return null;
    return { kind: SELECTION_KIND.one, index: value.index };
  }
  if (value.kind === SELECTION_KIND.mismatch) {
    if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null;
    if (!isIndex(value.first, deck.length) || !isIndex(value.second, deck.length)) return null;
    if (value.first === value.second || matched.includes(value.first) || matched.includes(value.second)) return null;
    if (deck[value.first] === deck[value.second] || !isSafeCount(value.remainingMs, MISMATCH_MS) || value.remainingMs === 0) {
      return null;
    }
    return { kind: SELECTION_KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
  }
  return null;
}

function isIndex(value: unknown, length: number): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0 && value < length;
}

function isSafeCount(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0 && value <= maximum;
}

