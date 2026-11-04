import { createGame, isWon, SELECTION_KIND } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { ELAPSED_CAP, MISMATCH_MS, MOVE_CAP } from './transitions.ts';
import { exactKeys, isNonnegativeInteger, isRecord, parseLimitedJson } from './formatValidation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65_536;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function readSelection(value: unknown, state: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number => isNonnegativeInteger(index) &&
    index < state.deck.length && !matched.includes(index);
  switch (value.kind) {
    case SELECTION_KIND.closed:
      return exactKeys(value, ['kind']) ? { kind: SELECTION_KIND.closed } : null;
    case SELECTION_KIND.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION_KIND.one, index: value.index } : null;
    case SELECTION_KIND.mismatch:
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          state.deck[value.first] === state.deck[value.second] ||
          !isNonnegativeInteger(value.remainingMs) || value.remainingMs < 1 ||
          value.remainingMs > MISMATCH_MS) return null;
      return { kind: SELECTION_KIND.mismatch, first: value.first, second: value.second,
        remainingMs: value.remainingMs };
    default: return null;
  }
}

function readMatched(value: unknown, state: GameState): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const indices: number[] = [];
  const counts = new Map<number, number>();
  for (const index of value) {
    if (!isNonnegativeInteger(index) || index >= state.deck.length || indices.includes(index)) return null;
    const face = state.deck[index];
    if (face === undefined) return null;
    indices.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2) ? indices : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseLimitedJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !exactKeys(value, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isNonnegativeInteger(value.moves) || value.moves > MOVE_CAP ||
      !isNonnegativeInteger(value.elapsedMs) || value.elapsedMs > ELAPSED_CAP) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const matched = readMatched(value.matched, initial);
  if (!matched) return null;
  const selection = readSelection(value.selection, initial, matched);
  if (!selection) return null;
  const state: GameState = { ...initial, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
  const minimumMoves = matched.length / 2 + (selection.kind === SELECTION_KIND.mismatch ? 1 : 0);
  if (state.moves < minimumMoves || (isWon(state) && selection.kind !== SELECTION_KIND.closed)) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 ||
      selection.kind !== SELECTION_KIND.closed)) return null;
  if (state.started && state.moves === 0 && selection.kind !== SELECTION_KIND.one) return null;
  return state;
}

export function encodeSnapshot(state: GameState): string {
  const selection: Selection = state.selection.kind === SELECTION_KIND.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.boardCode,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
