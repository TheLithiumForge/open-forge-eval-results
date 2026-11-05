import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from '../saved-format.ts';
import { isWon, ELAPSED_MAX_MS, MISMATCH_MS } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { alphabeticalJson, readTournamentState } from './validation.ts';
import { tournamentFieldError } from './field-error.ts';
import { TournamentPhase } from './rules.ts';
import type { GameState } from '../game.ts';
import type { TournamentState } from './rules.ts';

export const TOURNAMENT_MAX_BYTES = 131_072;
export interface TournamentArchive {
  readonly tournament: TournamentState | null;
  readonly game: GameState | null;
}

export function encodeTournament(
  tournament: TournamentState | null,
  game: GameState | null,
): string {
  const snapshot = game ? parseJson(encodeSnapshot(game)) : null;
  return alphabeticalJson({
    format: 'neon-pairs/tournament',
    version: 1,
    tournament,
    game:
      game && isJsonObject(snapshot)
        ? {
            ...snapshot,
            elapsedMs: game.elapsedMs,
            matched: game.matched,
            selection: game.selection,
          }
        : null,
  });
}

function readGame(value: unknown): GameState | null {
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
  if (
    selection.kind === SelectionKind.mismatch &&
    (typeof selection.remainingMs !== 'number' ||
      !Number.isFinite(selection.remainingMs) ||
      selection.remainingMs <= 0 ||
      selection.remainingMs > MISMATCH_MS)
  )
    return null;
  const game = decodeSnapshot(
    JSON.stringify({
      ...value,
      elapsedMs: Math.floor(value.elapsedMs),
      selection:
        selection.kind === SelectionKind.mismatch && typeof selection.remainingMs === 'number'
          ? { ...selection, remainingMs: Math.ceil(selection.remainingMs) }
          : selection,
    }),
  );
  if (!game || (!game.started && value.elapsedMs !== 0)) return null;
  return {
    ...game,
    elapsedMs: value.elapsedMs,
    selection:
      game.selection.kind === SelectionKind.mismatch && typeof selection.remainingMs === 'number'
        ? { ...game.selection, remainingMs: selection.remainingMs }
        : game.selection,
  };
}

export function readTournament(text: string): { archive: TournamentArchive | null; error: string } {
  const invalid = { archive: null, error: 'Invalid tournament.' };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  const value = parseJson(text);
  const error = tournamentFieldError(value);
  if (error) return { archive: null, error };
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'version', 'tournament', 'game']) ||
    value.format !== 'neon-pairs/tournament' ||
    value.version !== 1
  )
    return invalid;
  if (value.tournament === null && value.game === null)
    return { archive: { tournament: null, game: null }, error: '' };
  try {
    const tournament = readTournamentState(value.tournament);
    const game = readGame(value.game);
    if (!tournament || !game) return invalid;
    const match = tournament.matches[tournament.matchIndex];
    const result = match?.results[tournament.turn];
    const finished =
      tournament.phase !== TournamentPhase.ready && tournament.phase !== TournamentPhase.playing;
    if (
      !match ||
      match.boardCode !== game.boardCode ||
      isWon(game) !== finished ||
      (finished && (!result || result.moves !== game.moves || result.elapsedMs !== game.elapsedMs))
    )
      return invalid;
    return { archive: { tournament, game }, error: '' };
  } catch {
    return invalid;
  }
}
