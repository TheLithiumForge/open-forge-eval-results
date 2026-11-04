import { parseBoardCode } from './board-code.ts';
import { KIND, MAX_MOVES, MAX_ELAPSED_MS, MISMATCH_MS, createGame } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { exactKeys, integer, isObject, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection: state.selection, moves: state.moves,
    elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

function readSelection(value: unknown, eligible: (index: unknown) => index is number,
  deck: readonly number[]): Selection | null {
  if (!isObject(value)) return null;
  switch (value.kind) {
    case KIND.closed:
      return exactKeys(value, ['kind']) ? { kind: KIND.closed } : null;
    case KIND.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: KIND.one, index: value.index } : null;
    case KIND.mismatch:
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !eligible(value.first) || !eligible(value.second) || value.first === value.second
        || deck[value.first] === deck[value.second] || !integer(value.remainingMs, MISMATCH_MS)
        || value.remainingMs < 1) return null;
      return { kind: KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTES);
  if (!isObject(value) || !exactKeys(value,
    ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])
    || value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string'
    || !parseBoardCode(value.boardCode) || !Array.isArray(value.matched)
    || !integer(value.moves, MAX_MOVES) || !integer(value.elapsedMs, MAX_ELAPSED_MS)
    || typeof value.started !== 'boolean') return null;
  const state = createGame(value.boardCode);
  const matched: number[] = [];
  const faces = new Map<number, number>();
  for (const index of value.matched) {
    if (!integer(index, state.board.deck.length - 1) || matched.includes(index)) return null;
    const face = state.board.deck[index];
    if (face === undefined) return null;
    matched.push(index);
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const eligible = (index: unknown): index is number =>
    integer(index, state.board.deck.length - 1) && !matched.includes(index);
  const selection = readSelection(value.selection, eligible, state.board.deck);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === KIND.mismatch ? 1 : 0)) return null;
  if (matched.length === state.board.deck.length && selection.kind !== KIND.closed) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0
    || matched.length !== 0 || selection.kind !== KIND.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== KIND.one) return null;
  return { ...state, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
}
