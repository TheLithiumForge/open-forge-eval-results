import { ELAPSED_MAX_MS, MISMATCH_MS } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isJsonObject } from '../saved-format.ts';
import { SelectionKind } from '../selection.ts';
import type { GameState } from '../game.ts';

export function tournamentGameValue(game: GameState | null): unknown {
  if (!game) return null;
  const value: unknown = JSON.parse(encodeSnapshot(game));
  return isJsonObject(value)
    ? { ...value, matched: game.matched, elapsedMs: game.elapsedMs, selection: game.selection }
    : null;
}

export function readTournamentGame(value: unknown): GameState | null {
  if (
    !isJsonObject(value) ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  const selection = value.selection;
  if (!isJsonObject(selection)) return null;
  const remaining = selection.kind === SelectionKind.mismatch ? selection.remainingMs : null;
  if (
    remaining !== null &&
    (typeof remaining !== 'number' ||
      !Number.isFinite(remaining) ||
      remaining <= 0 ||
      remaining > MISMATCH_MS)
  )
    return null;
  const game = decodeSnapshot(
    JSON.stringify({
      ...value,
      elapsedMs: Math.floor(value.elapsedMs),
      selection:
        typeof remaining === 'number'
          ? { ...selection, remainingMs: Math.ceil(remaining) }
          : selection,
    }),
  );
  if (!game) return null;
  if (!game.started && value.elapsedMs !== 0) return null;
  return {
    ...game,
    elapsedMs: value.elapsedMs,
    selection:
      game.selection.kind === SelectionKind.mismatch && typeof remaining === 'number'
        ? { ...game.selection, remainingMs: remaining }
        : game.selection,
  };
}
