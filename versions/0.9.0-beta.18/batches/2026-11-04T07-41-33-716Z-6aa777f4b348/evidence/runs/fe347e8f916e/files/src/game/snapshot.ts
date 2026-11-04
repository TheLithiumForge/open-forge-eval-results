import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION } from './model.ts';
import type { GameState, Selection } from './model.ts';
import { exactKeys, integer, object, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_LIMIT = 65536;
const KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: [...state.matched].sort((a, b) => a - b), selection,
    moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}

function decodeSelection(value: unknown, eligible: (index: unknown) => index is number): Selection | null {
  if (!object(value)) return null;
  switch (value.kind) {
    case SELECTION.closed:
      return exactKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          !integer(value.remainingMs, MISMATCH_MS) || value.remainingMs === 0) return null;
      return { kind: SELECTION.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const data = parseJson(text, SNAPSHOT_LIMIT);
  if (!object(data) || !exactKeys(data, KEYS) || data.version !== SNAPSHOT_VERSION ||
      typeof data.boardCode !== 'string' || !Array.isArray(data.matched) ||
      !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_ELAPSED_MS) ||
      typeof data.started !== 'boolean') return null;
  const initial = createGame(data.boardCode);
  if (!initial) return null;
  const deck = initial.board.deck;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of data.matched) {
    if (!integer(index, deck.length - 1) || matched.includes(index)) return null;
    const face = deck[index];
    if (face === undefined) return null;
    matched.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count !== 2)) return null;
  const eligible = (index: unknown): index is number =>
    integer(index, deck.length - 1) && !matched.includes(index);
  const selection = decodeSelection(data.selection, eligible);
  if (!selection) return null;
  if (selection.kind === SELECTION.mismatch && deck[selection.first] === deck[selection.second]) return null;
  const minimumMoves = matched.length / 2 + (selection.kind === SELECTION.mismatch ? 1 : 0);
  if (data.moves < minimumMoves) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 ||
      matched.length !== 0 || selection.kind !== SELECTION.closed)) return null;
  if (data.started && data.moves === 0 && selection.kind !== SELECTION.one) return null;
  const state = { ...initial, matched, selection, moves: data.moves,
    elapsedMs: data.elapsedMs, started: data.started };
  return isWon(state) && selection.kind !== SELECTION.closed ? null : state;
}
