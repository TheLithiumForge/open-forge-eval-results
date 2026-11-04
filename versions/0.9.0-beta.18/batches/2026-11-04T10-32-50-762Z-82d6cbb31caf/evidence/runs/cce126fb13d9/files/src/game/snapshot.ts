import { createGame, MOVES_MAX, ELAPSED_MAX_MS } from './game.ts';
import { parseBoardCode } from './deck.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from './saved-format.ts';
import { readMatched, readSelection } from './snapshot-selection.ts';
import { SelectionKind } from './selection.ts';
import { isValidDealName } from './deal-name.ts';
import type { GameState } from './game.ts';

export const SNAPSHOT_VERSION = 1;
const NAMED_SNAPSHOT_VERSION = 2;
export const SNAPSHOT_MAX_BYTES = 65_536;
export const SNAPSHOT_KEYS = [
  'version',
  'boardCode',
  'matched',
  'selection',
  'moves',
  'elapsedMs',
  'started',
] as const;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify(
    {
      version: state.name === '' ? SNAPSHOT_VERSION : NAMED_SNAPSHOT_VERSION,
      ...(state.name === '' ? {} : { name: state.name }),
      boardCode: state.boardCode,
      matched: [...state.matched].sort((left, right) => left - right),
      // Active time keeps its fractions in play. Export writes whole milliseconds, and rounding
      // pending time up keeps a mismatch at 1ms or more.
      selection:
        state.selection.kind === SelectionKind.mismatch
          ? { ...state.selection, remainingMs: Math.ceil(state.selection.remainingMs) }
          : state.selection,
      moves: state.moves,
      elapsedMs: Math.floor(state.elapsedMs),
      started: state.started,
    },
    null,
    2,
  );
}

export function decodeSnapshot(text: string): GameState | null {
  const value = isWithinBytes(text, SNAPSHOT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return null;
  const keys =
    value.version === SNAPSHOT_VERSION
      ? SNAPSHOT_KEYS
      : value.version === NAMED_SNAPSHOT_VERSION
        ? [...SNAPSHOT_KEYS, 'name']
        : null;
  if (!keys || !hasExactKeys(value, keys)) return null;
  const name = value.version === NAMED_SNAPSHOT_VERSION ? value.name : '';
  if (!isValidDealName(name) || (value.version === NAMED_SNAPSHOT_VERSION && name === ''))
    return null;
  if (typeof value.boardCode !== 'string' || !parseBoardCode(value.boardCode)) return null;
  if (
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS ||
    typeof value.started !== 'boolean'
  )
    return null;
  const initial = createGame(value.boardCode);
  const matched = readMatched(value.matched, initial);
  if (!matched) return null;
  const selection = readSelection(value.selection, initial, matched);
  if (!selection) return null;
  const state: GameState = {
    ...initial,
    name,
    matched,
    selection,
    moves: value.moves,
    elapsedMs: value.elapsedMs,
    started: value.started,
  };
  const minimumMoves = matched.length / 2 + (selection.kind === SelectionKind.mismatch ? 1 : 0);
  if (state.moves < minimumMoves) return null;
  if (
    !state.started &&
    (state.moves !== 0 ||
      state.elapsedMs !== 0 ||
      matched.length !== 0 ||
      selection.kind !== SelectionKind.closed)
  )
    return null;
  if (state.started && state.moves === 0 && selection.kind === SelectionKind.closed) return null;
  return state;
}
