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
import type { GameState } from './game.ts';

export const SNAPSHOT_VERSION = 1;
export const NAMED_SNAPSHOT_VERSION = 2;
export const SNAPSHOT_MAX_BYTES = 65_536;
export const SNAPSHOT_NAME_MAX_CHARACTERS = 40;
export const SNAPSHOT_KEYS = [
  'version',
  'boardCode',
  'matched',
  'selection',
  'moves',
  'elapsedMs',
  'started',
] as const;
export const NAMED_SNAPSHOT_KEYS = ['version', 'name', ...SNAPSHOT_KEYS.slice(1)] as const;

interface DecodedSnapshot {
  readonly game: GameState;
  readonly name: string;
}

export function isValidDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= SNAPSHOT_NAME_MAX_CHARACTERS &&
    !value.includes('\r') &&
    !value.includes('\n')
  );
}

export function encodeSnapshot(state: GameState, name = ''): string {
  const fields = {
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
  };
  const value =
    name.length > 0 && isValidDealName(name)
      ? { version: NAMED_SNAPSHOT_VERSION, name, ...fields }
      : { version: SNAPSHOT_VERSION, ...fields };
  return JSON.stringify(value, null, 2);
}

export function decodeSnapshotData(text: string): DecodedSnapshot | null {
  const value = isWithinBytes(text, SNAPSHOT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return null;
  const named = value.version === NAMED_SNAPSHOT_VERSION;
  if (value.version !== SNAPSHOT_VERSION && !named) return null;
  const keys = named ? NAMED_SNAPSHOT_KEYS : SNAPSHOT_KEYS;
  if (!hasExactKeys(value, keys)) return null;
  let name = '';
  if (named) {
    if (!isValidDealName(value.name) || value.name.length === 0) return null;
    name = value.name;
  }
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
  return { game: state, name };
}

export function decodeSnapshot(text: string): GameState | null {
  return decodeSnapshotData(text)?.game ?? null;
}
