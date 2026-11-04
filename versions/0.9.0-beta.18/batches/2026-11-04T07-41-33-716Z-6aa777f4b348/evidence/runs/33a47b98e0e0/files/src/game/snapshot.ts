import { createGame, GAME_LIMITS, isWon, type GameState, type Selection } from './state.ts';
import { hasExactKeys, isIndex, isRecord, isSafeCount, parseJson } from './formatValidation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65_536;

export function encodeSnapshot(state: GameState): string {
  let selection: unknown;
  switch (state.selection.kind) {
    case 'closed':
      selection = { kind: 'closed' };
      break;
    case 'one':
      selection = { kind: 'one', index: state.selection.index };
      break;
    case 'mismatch':
      selection = {
        kind: 'mismatch',
        first: state.selection.first,
        second: state.selection.second,
        remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)),
      };
      break;
  }
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.boardCode,
    matched: state.matched,
    selection,
    moves: state.moves,
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started,
  }, null, 2);
}

function parseSelection(value: unknown, state: GameState, matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  switch (value.kind) {
    case 'closed':
      return hasExactKeys(value, ['kind']) ? Object.freeze({ kind: 'closed' }) : null;
    case 'one':
      if (!hasExactKeys(value, ['kind', 'index']) || !isIndex(value.index, state.deck.length)) return null;
      return matched.has(value.index) ? null : Object.freeze({ kind: 'one', index: value.index });
    case 'mismatch':
      if (!hasExactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null;
      if (!isIndex(value.first, state.deck.length) || !isIndex(value.second, state.deck.length)) return null;
      if (value.first === value.second || matched.has(value.first) || matched.has(value.second)) return null;
      if (state.deck[value.first] === state.deck[value.second]) return null;
      if (!isSafeCount(value.remainingMs) || value.remainingMs < 1 || value.remainingMs > GAME_LIMITS.mismatchMs) return null;
      return Object.freeze({ kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs });
    default:
      return null;
  }
}

function hasCompletePairs(state: GameState, matched: readonly number[]): boolean {
  const positions = new Set(matched);
  for (const index of matched) {
    const face = state.deck[index];
    if (face === undefined) return false;
    const first = state.deck.indexOf(face);
    const second = state.deck.lastIndexOf(face);
    if (!positions.has(first) || !positions.has(second)) return false;
  }
  return true;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = parseJson(text, SNAPSHOT_BYTE_LIMIT);
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null;
  if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string') return null;
  const base = createGame(value.boardCode);
  if (base === null || !Array.isArray(value.matched)) return null;
  if (!isSafeCount(value.moves) || value.moves > GAME_LIMITS.maxMoves) return null;
  if (!isSafeCount(value.elapsedMs) || value.elapsedMs > GAME_LIMITS.maxElapsedMs || typeof value.started !== 'boolean') return null;
  const matched: number[] = [];
  for (const index of value.matched) {
    if (!isIndex(index, base.deck.length) || matched.includes(index)) return null;
    matched.push(index);
  }
  if (matched.length % 2 !== 0 || !hasCompletePairs(base, matched)) return null;
  const matchedSet = new Set(matched);
  const selection = parseSelection(value.selection, base, matchedSet);
  if (selection === null || (isWon({ ...base, matched }) && selection.kind !== 'closed')) return null;
  const pairCount = matched.length / 2;
  const minimumMoves = pairCount + (selection.kind === 'mismatch' ? 1 : 0);
  if (value.moves < minimumMoves) return null;
  if (!value.started) {
    if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed') return null;
  } else if (value.moves === 0 && selection.kind !== 'one') {
    return null;
  }
  return Object.freeze({ ...base, matched: Object.freeze(matched), selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started });
}
