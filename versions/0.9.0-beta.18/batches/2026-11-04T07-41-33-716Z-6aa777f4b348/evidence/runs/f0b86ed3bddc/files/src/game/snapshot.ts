import { parseBoardCode } from './boardCode.ts';
import { CLOSED, ONE, MISMATCH, MISMATCH_MS, MAX_MOVES, MAX_ELAPSED_MS, createGame, isWon, pairCount } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { exactKeys, integerIn, isObject, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;
const KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function readSelection(value: unknown, length: number, matched: readonly number[]): Selection | null {
  if (!isObject(value)) return null;
  const eligible = (index: unknown): index is number => integerIn(index, 0, length - 1) && !matched.includes(index);
  switch (value.kind) {
    case CLOSED: return exactKeys(value, ['kind']) ? { kind: CLOSED } : null;
    case ONE:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index) ? { kind: ONE, index: value.index } : null;
    case MISMATCH:
      return exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
        eligible(value.first) && eligible(value.second) && value.first !== value.second &&
        integerIn(value.remainingMs, 1, MISMATCH_MS)
        ? { kind: MISMATCH, first: value.first, second: value.second, remainingMs: value.remainingMs } : null;
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const data = parseJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isObject(data) || !exactKeys(data, KEYS) || data.version !== SNAPSHOT_VERSION ||
      typeof data.boardCode !== 'string' || !parseBoardCode(data.boardCode) ||
      !Array.isArray(data.matched) || typeof data.started !== 'boolean' ||
      !integerIn(data.moves, 0, MAX_MOVES) || !integerIn(data.elapsedMs, 0, MAX_ELAPSED_MS)) return null;
  const initial = createGame(data.boardCode);
  const length = initial.board.deck.length;
  const matched: number[] = [];
  for (const index of data.matched) {
    if (!integerIn(index, 0, length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const counts = new Map<number, number>();
  for (const index of matched) {
    const face = initial.board.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const selection = readSelection(data.selection, length, matched);
  if (!selection || (selection.kind === MISMATCH &&
      initial.board.deck[selection.first] === initial.board.deck[selection.second])) return null;
  const state: GameState = { ...initial, matched, selection, moves: data.moves,
    elapsedMs: data.elapsedMs, started: data.started };
  const minimumMoves = pairCount(state) + (selection.kind === MISMATCH ? 1 : 0);
  if (state.moves < minimumMoves || (isWon(state) && selection.kind !== CLOSED)) return null;
  if (!state.started && (state.moves !== 0 || state.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== CLOSED)) return null;
  if (state.started && state.moves === 0 && selection.kind !== ONE) return null;
  return state;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === MISMATCH
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
