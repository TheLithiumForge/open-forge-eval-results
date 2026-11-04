import { createGame, MOVES_MAX, ELAPSED_MAX_MS } from './game.ts';
import { parseBoardCode } from './deck.ts';
import { cleanGameName, isGameName } from './game-name.ts';
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
// An unnamed save leaves the name out, so it matches a save written before games had names.
export const SNAPSHOT_NAME_KEY = 'name';

interface SavedGame {
  readonly game: GameState;
  readonly name: string;
}

export function encodeSnapshot(state: GameState, name = ''): string {
  const label = cleanGameName(name);
  return JSON.stringify(
    {
      version: SNAPSHOT_VERSION,
      ...(label ? { [SNAPSHOT_NAME_KEY]: label } : {}),
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
  return readSnapshot(text)?.game ?? null;
}

// JSON objects have no key order, so a save loads whatever order its fields arrive in.
export function readSnapshot(text: string): SavedGame | null {
  const value = isWithinBytes(text, SNAPSHOT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return null;
  const { [SNAPSHOT_NAME_KEY]: name = '', ...fields } = value;
  if (!hasExactKeys(fields, SNAPSHOT_KEYS) || value.version !== SNAPSHOT_VERSION) return null;
  if (!isGameName(name)) return null;
  const game = readGame(value);
  return game ? { game, name: cleanGameName(name) } : null;
}

function readGame(value: Record<string, unknown>): GameState | null {
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
  return state;
}
