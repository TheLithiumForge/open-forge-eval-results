import { createGame, MOVES_MAX, ELAPSED_MAX_MS } from './game.ts';
import { parseBoardCode } from './deck.ts';
import { isDealName } from './deal-name.ts';
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
export const SNAPSHOT_KEYS = [
  'version',
  'boardCode',
  'matched',
  'selection',
  'moves',
  'elapsedMs',
  'started',
] as const;
const NAMED_SNAPSHOT_KEYS = [...SNAPSHOT_KEYS, 'name'];

export function encodeSnapshot(state: GameState): string {
  const version = state.name
    ? { version: NAMED_SNAPSHOT_VERSION, name: state.name }
    : { version: SNAPSHOT_VERSION };
  return JSON.stringify(
    {
      ...version,
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

// JSON objects are unordered, so a pasted snapshot can list its fields in another order.
function readName(value: Record<string, unknown>): string | null {
  if (value.version === SNAPSHOT_VERSION) return hasExactKeys(value, SNAPSHOT_KEYS) ? '' : null;
  if (value.version !== NAMED_SNAPSHOT_VERSION || !hasExactKeys(value, NAMED_SNAPSHOT_KEYS))
    return null;
  return isDealName(value.name) ? value.name : null;
}

export function decodeSnapshot(text: string): GameState | null {
  const value = isWithinBytes(text, SNAPSHOT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return null;
  const name = readName(value);
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
