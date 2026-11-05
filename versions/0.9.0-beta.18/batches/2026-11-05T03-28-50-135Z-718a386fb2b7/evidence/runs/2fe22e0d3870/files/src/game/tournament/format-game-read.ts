import { decodeSnapshot } from '../snapshot.ts';
import { SelectionKind } from '../selection.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import type { GameState } from '../game.ts';
import type { Selection } from '../selection.ts';

const GAME_KEYS = ['boardCode', 'elapsedMs', 'matched', 'moves', 'selection', 'started'] as const;

export function readTournamentGame(
  value: unknown,
  boardCode: string,
): GameState | null | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, GAME_KEYS) ||
    value.boardCode !== boardCode ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    !isNonnegativeSafeInteger(value.moves) ||
    typeof value.started !== 'boolean' ||
    !Array.isArray(value.matched) ||
    !value.matched.every(isNonnegativeSafeInteger)
  )
    return undefined;
  const selection = readSelection(value.selection);
  if (!selection) return undefined;
  const game = decodeSnapshot(
    JSON.stringify({
      version: 1,
      boardCode,
      matched: value.matched,
      selection,
      moves: value.moves,
      elapsedMs: value.elapsedMs,
      started: value.started,
    }),
  );
  return game ?? undefined;
}

function readSelection(value: unknown): Selection | null {
  if (!isJsonObject(value) || typeof value.kind !== 'string') return null;
  if (value.kind === SelectionKind.closed && hasExactKeys(value, ['kind']))
    return { kind: SelectionKind.closed };
  if (
    value.kind === SelectionKind.one &&
    hasExactKeys(value, ['index', 'kind']) &&
    isNonnegativeSafeInteger(value.index)
  )
    return { kind: SelectionKind.one, index: value.index };
  if (
    value.kind === SelectionKind.mismatch &&
    hasExactKeys(value, ['first', 'kind', 'remainingMs', 'second']) &&
    isNonnegativeSafeInteger(value.first) &&
    isNonnegativeSafeInteger(value.second) &&
    isNonnegativeSafeInteger(value.remainingMs) &&
    value.remainingMs > 0 &&
    value.remainingMs <= 800
  )
    return {
      kind: SelectionKind.mismatch,
      first: value.first,
      second: value.second,
      remainingMs: value.remainingMs,
    };
  return null;
}
