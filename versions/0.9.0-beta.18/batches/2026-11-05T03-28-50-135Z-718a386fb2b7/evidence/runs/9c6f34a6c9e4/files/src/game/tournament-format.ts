import { isWon } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from './saved-format.ts';
import { currentTournamentMatch, isValidTournamentResult } from './tournament.ts';
import { isValidTournament } from './tournament-validation.ts';
import type { GameState } from './game.ts';
import type { Tournament, TournamentDraft } from './tournament.ts';

const EXPORT_FORMAT = 'neon-pairs-tournament';
const EXPORT_VERSION = 1;
const EXPORT_MAX_BYTES = 200_000;

interface LoadedTournament {
  readonly draft: TournamentDraft;
  readonly tournament: Tournament | null;
  readonly game: GameState | null;
}

export function encodeTournament(
  draft: TournamentDraft,
  tournament: Tournament | null,
  game: GameState | null,
): string {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      draft,
      tournament,
      game: tournament?.status === 'active' && game ? encodeSnapshot(game) : null,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): LoadedTournament | null {
  const value = isWithinBytes(text, EXPORT_MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'version', 'draft', 'tournament', 'game']) ||
    value.format !== EXPORT_FORMAT ||
    value.version !== EXPORT_VERSION
  )
    return null;
  const draft = value.draft;
  if (!isValidDraft(draft)) return null;
  const tournament = value.tournament === null ? null : value.tournament;
  if (tournament !== null && !isValidTournament(tournament)) return null;
  if (tournament === null) return value.game === null ? { draft, tournament, game: null } : null;
  if (
    tournament.players.length !== draft.playerCount ||
    tournament.players.some((player, index) => player.name !== draft.names[index])
  )
    return null;
  if (tournament.status === 'complete')
    return value.game === null ? { draft, tournament, game: null } : null;
  if (typeof value.game !== 'string') return null;
  const game = decodeSnapshot(value.game);
  if (!game || game.boardCode !== currentTournamentMatch(tournament).boardCode) return null;
  const result = currentTournamentMatch(tournament).results[tournament.turn];
  if (result === null) return !isWon(game) ? { draft, tournament, game } : null;
  return isWon(game) &&
    isValidTournamentResult(result, game.size) &&
    game.moves === result.moves &&
    Math.floor(game.elapsedMs) === Math.floor(result.elapsedMs)
    ? { draft, tournament, game }
    : null;
}

function isValidDraft(value: unknown): value is TournamentDraft {
  return (
    isJsonObject(value) &&
    hasExactKeys(value, ['playerCount', 'names']) &&
    (value.playerCount === 4 || value.playerCount === 8) &&
    Array.isArray(value.names) &&
    value.names.length === value.playerCount &&
    value.names.every((name) => typeof name === 'string' && name.length <= 60)
  );
}
