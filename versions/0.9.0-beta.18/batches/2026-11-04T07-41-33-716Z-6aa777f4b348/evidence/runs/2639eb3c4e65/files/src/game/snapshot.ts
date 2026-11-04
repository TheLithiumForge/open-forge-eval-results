import { createGame } from './transitions.ts';
import { MAX_MOVES, MAX_ELAPSED_MS, MISMATCH_MS } from './model.ts';
import type { GameState, Selection } from './model.ts';
import { hasKeys, isInteger, isRecord, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;
const FIELDS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function readSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    isInteger(index, game.board.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed': return hasKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one': return hasKeys(value, ['kind', 'index']) && eligible(value.index) ?
      { kind: 'one', index: value.index } : null;
    case 'mismatch':
      return hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
        eligible(value.first) && eligible(value.second) && value.first !== value.second &&
        game.board.deck[value.first] !== game.board.deck[value.second] &&
        isInteger(value.remainingMs, MISMATCH_MS) && value.remainingMs >= 1 ? {
          kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs,
        } : null;
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTES);
  if (!isRecord(value) || !hasKeys(value, FIELDS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || typeof value.started !== 'boolean' ||
      !isInteger(value.moves, MAX_MOVES) || !isInteger(value.elapsedMs, MAX_ELAPSED_MS) ||
      !Array.isArray(value.matched)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched: number[] = [];
  const counts = new Map<number, number>();
  for (const index of value.matched) {
    if (!isInteger(index, game.board.deck.length - 1) || matched.includes(index)) return null;
    const face = game.board.deck[index];
    if (face === undefined) return null;
    matched.push(index);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const selection = readSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  if (matched.length === game.board.deck.length && selection.kind !== 'closed') return null;
  return { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch' ? {
    ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)),
  } : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code, matched: [...state.matched].sort((a, b) => a - b),
    selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started,
  }, null, 2);
}
