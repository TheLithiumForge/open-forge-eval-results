import { createGame, isWon, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { hasKeys, isRecord, nonnegativeInteger, parseJSON } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection: state.selection, moves: state.moves,
    elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

function readSelection(value: unknown, state: GameState, matched: readonly number[]): Selection | null {
  if (!isRecord(value)) return null;
  const eligible = (index: unknown): index is number =>
    nonnegativeInteger(index, state.deck.length - 1) && !matched.includes(index);
  switch (value.kind) {
    case 'closed':
      return hasKeys(value, ['kind']) ? { kind: 'closed' } : null;
    case 'one':
      return hasKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: 'one', index: value.index } : null;
    case 'mismatch':
      if (!hasKeys(value, ['kind', 'first', 'second', 'remainingMs'])
        || !eligible(value.first) || !eligible(value.second) || value.first === value.second
        || state.deck[value.first] === state.deck[value.second]
        || !nonnegativeInteger(value.remainingMs, MISMATCH_MS) || value.remainingMs < 1) return null;
      return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
    default:
      return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJSON(text, SNAPSHOT_BYTES);
  if (!isRecord(value) || !hasKeys(value, ['version', 'boardCode', 'matched', 'selection',
    'moves', 'elapsedMs', 'started']) || value.version !== SNAPSHOT_VERSION
    || typeof value.boardCode !== 'string') return null;
  const initial = createGame(value.boardCode);
  if (!initial || !Array.isArray(value.matched)
    || !nonnegativeInteger(value.moves, MAX_MOVES)
    || !nonnegativeInteger(value.elapsedMs, MAX_ELAPSED_MS)
    || typeof value.started !== 'boolean') return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!nonnegativeInteger(index, initial.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = initial.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const selection = readSelection(value.selection, initial, matched);
  if (!selection || value.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0
    || selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  const state: GameState = { ...initial, matched, selection, moves: value.moves,
    elapsedMs: value.elapsedMs, started: value.started };
  return isWon(state) && selection.kind !== 'closed' ? null : state;
}
