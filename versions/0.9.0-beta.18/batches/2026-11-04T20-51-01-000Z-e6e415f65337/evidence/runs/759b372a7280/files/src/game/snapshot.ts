import { createGame, MOVES_MAX, ELAPSED_MAX_MS } from './game.ts';
import { parseBoardCode } from './deck.ts';
import {
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from './saved-format.ts';
import { readMatched, readSelection } from './snapshot-selection.ts';
import { SelectionKind } from './selection.ts';
import type { GameState } from './game.ts';

export const SNAPSHOT_VERSION = 1;
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
// A snapshot may also carry a name. Saves made before names existed have none.
const SNAPSHOT_NAME_KEY = 'name';
// Pasting a saved file can bring a leading byte order mark that JSON text must not have.
const BYTE_ORDER_MARK = '\uFEFF';

export function encodeSnapshot(state: GameState): string {
  const name = state.name?.trim();
  return JSON.stringify(
    {
      version: SNAPSHOT_VERSION,
      ...(name ? { name } : {}),
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
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  const value = isWithinBytes(source, SNAPSHOT_MAX_BYTES) ? parseJson(source) : undefined;
  // Pasted saves may list their fields in a different order. Each required field must appear once.
  if (
    !isJsonObject(value) ||
    !SNAPSHOT_KEYS.every((key) => Object.hasOwn(value, key)) ||
    !Object.keys(value).every(
      (key) => key === SNAPSHOT_NAME_KEY || SNAPSHOT_KEYS.some((field) => field === key),
    ) ||
    value.version !== SNAPSHOT_VERSION
  )
    return null;
  const name = readName(value[SNAPSHOT_NAME_KEY]);
  if (name === null) return null;
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
    ...(name ? { name } : {}),
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

// An absent name is allowed. A present one must be text that fits the name field.
function readName(value: unknown): string | null {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length <= SNAPSHOT_NAME_MAX_CHARACTERS ? name : null;
}
