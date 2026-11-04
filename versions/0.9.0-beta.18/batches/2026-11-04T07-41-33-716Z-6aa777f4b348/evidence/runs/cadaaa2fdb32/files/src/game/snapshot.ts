import { hasKeys, isInteger, isRecord, readJSON } from './formatValidation.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './rules.ts';
import { createGame, isWon, SELECTION } from './state.ts';
import type { GameState, Selection } from './state.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;
const KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function decodeSelection(value: unknown, game: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    isInteger(index, game.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case SELECTION.closed:
      return hasKeys(value, ['kind']) ? { kind: SELECTION.closed } : null;
    case SELECTION.one:
      return hasKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: SELECTION.one, index: value.index } : null;
    case SELECTION.mismatch:
      if (!hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
          !eligible(value.first) || !eligible(value.second) || value.first === value.second ||
          game.deck[value.first] === game.deck[value.second] ||
          !isInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: SELECTION.mismatch, first: value.first,
        second: value.second, remainingMs: value.remainingMs };
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = readJSON(text, SNAPSHOT_BYTES);
  if (!isRecord(value) || !hasKeys(value, KEYS) || value.version !== SNAPSHOT_VERSION ||
      typeof value.boardCode !== 'string' || !Array.isArray(value.matched) ||
      !isInteger(value.moves, MAX_MOVES) || !isInteger(value.elapsedMs, MAX_ELAPSED_MS) ||
      typeof value.started !== 'boolean') return null;
  const game = createGame(value.boardCode);
  if (!game) return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!isInteger(index, game.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = game.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const selection = decodeSelection(value.selection, game, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === SELECTION.mismatch ? 1 : 0)) {
    return null;
  }
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 ||
      selection.kind !== SELECTION.closed)) return null;
  if (value.started && value.moves === 0 && selection.kind !== SELECTION.one) return null;
  const restored = { ...game, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
  return isWon(restored) && selection.kind !== SELECTION.closed ? null : restored;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection, moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
