import { isWon } from '../game.ts';
import { decodeSnapshot, SNAPSHOT_MAX_BYTES } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { currentMatch, isPlayerCount, type Tournament, type TournamentDraft } from './tournament.ts';
import { isValidTournament } from './tournament-validation.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_FORMAT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;

export interface TournamentTransfer {
  readonly draft: TournamentDraft;
  readonly gameSnapshot: string | null;
  readonly tournament: Tournament | null;
}

export function encodeTournament(transfer: TournamentTransfer): string {
  const value = {
    draft: transfer.draft,
    format: TOURNAMENT_FORMAT,
    gameSnapshot: transfer.gameSnapshot,
    tournament: transfer.tournament,
    version: TOURNAMENT_FORMAT_VERSION,
  };
  return JSON.stringify(sortKeys(value), null, 2);
}

export function decodeTournament(text: string): TournamentTransfer | null {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['draft', 'format', 'gameSnapshot', 'tournament', 'version']) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_FORMAT_VERSION ||
    !validDraft(value.draft)
  )
    return null;
  if (value.tournament !== null && !isValidTournament(value.tournament)) return null;
  if (value.gameSnapshot !== null && typeof value.gameSnapshot !== 'string') return null;
  if (typeof value.gameSnapshot === 'string') {
    if (value.gameSnapshot.length > SNAPSHOT_MAX_BYTES) return null;
    const game = decodeSnapshot(value.gameSnapshot);
    const tournament = value.tournament as Tournament | null;
    const match = tournament ? currentMatch(tournament) : null;
    const position = tournament?.current;
    if (
      !game ||
      !tournament ||
      tournament.status !== 'active' ||
      !position ||
      !match ||
      match.results[position.turn] !== null ||
      game.boardCode !== match.boardCode
    )
      return null;
    // A completed snapshot is allowed only for the current unfinished attempt. Loading it will
    // record the same visible result through the ordinary completion boundary.
    if (isWon(game) && !game.started) return null;
  }
  return {
    draft: value.draft,
    gameSnapshot: value.gameSnapshot,
    tournament: value.tournament as Tournament | null,
  };
}

function validDraft(value: unknown): value is TournamentDraft {
  return (
    isJsonObject(value) &&
    hasExactKeys(value, ['playerCount', 'players']) &&
    typeof value.playerCount === 'number' &&
    isPlayerCount(value.playerCount) &&
    Array.isArray(value.players) &&
    value.players.length === 8 &&
    value.players.every((name) => typeof name === 'string')
  );
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== 'object' || value === null) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  return sorted;
}
