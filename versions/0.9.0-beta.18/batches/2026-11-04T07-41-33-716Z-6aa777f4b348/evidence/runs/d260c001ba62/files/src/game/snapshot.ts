import { createGame, isWon, SELECTION } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './transitions.ts';
import { array, exactKeys, integer, parseJson, record } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;

function decodeSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!record(value)) return null;
  const eligible = (index: unknown): index is number =>
    integer(index, game.board.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return exactKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) || !eligible(value.first) ||
        !eligible(value.second) || value.first === value.second ||
        game.board.deck[value.first] === game.board.deck[value.second] ||
        !integer(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: SELECTION.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!record(value) || !exactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) ||
    value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string' ||
    !integer(value.moves, MAX_MOVES) || !integer(value.elapsedMs, MAX_ELAPSED_MS) ||
    typeof value.started !== 'boolean' || !array(value.matched)) return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched = value.matched;
  if (!matched.every((index): index is number => integer(index, game.board.deck.length - 1)) ||
    new Set(matched).size !== matched.length) return null;
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = game.board.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === SELECTION.mismatch ? 1 : 0)) return null;
  const result = { ...game, matched, selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
  if (isWon(result) && selection.kind !== SELECTION.closed) return null;
  if (!result.started && (result.moves !== 0 || result.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION.closed)) return null;
  if (result.started && result.moves === 0 && selection.kind !== SELECTION.one) return null;
  return result;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION, boardCode: state.board.code, matched: state.matched,
    selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started,
  }, null, 2);
}
