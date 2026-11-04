import { createGame } from './deal.ts';
import type { GameState, Selection } from './model.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './transitions.ts';
import { exactKeys, integer, isObject, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;

function readSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isObject(value)) return null;
  const eligible = (index: unknown): index is number => integer(index, game.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed': return exactKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one': return exactKeys(value, ['kind', 'index']) && eligible(value.index)
      ? { kind: 'one', index: value.index } : null;
    case 'mismatch': {
      const { first, second, remainingMs } = value;
      return exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
        eligible(first) && eligible(second) && first !== second && game.deck[first] !== game.deck[second] &&
        integer(remainingMs, MISMATCH_MS) && remainingMs > 0
        ? { kind: 'mismatch', first, second, remainingMs } : null;
    }
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTES);
  if (!isObject(value) || !exactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) ||
      value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string' ||
      typeof value.started !== 'boolean' || !integer(value.moves, MAX_MOVES) ||
      !integer(value.elapsedMs, MAX_ELAPSED_MS) || !Array.isArray(value.matched)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched: number[] = [];
  const faces = new Map<number, number>();
  for (const index of value.matched) {
    if (!integer(index, game.deck.length - 1) || matched.includes(index)) return null;
    const face = game.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
    matched.push(index);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const selection = readSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + Number(selection.kind === 'mismatch')) return null;
  if (matched.length === game.deck.length && selection.kind !== 'closed') return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  return { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch'
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
