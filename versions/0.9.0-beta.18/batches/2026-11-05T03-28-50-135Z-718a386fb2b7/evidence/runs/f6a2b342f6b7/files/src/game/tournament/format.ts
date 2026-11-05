import { decodeTournamentValue } from './decode.ts';
import { findTournamentUnknownField } from './unknown-fields.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_VERSION } from './format-identity.ts';
import { isWithinBytes, parseJson } from '../saved-format.ts';
import type { Tournament } from './types.ts';

const TOURNAMENT_MAX_BYTES = 65_536;

export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      tournament: {
        champion: playerValue(tournament.champion),
        currentMatch: tournament.currentMatch,
        currentTurn: tournament.currentTurn,
        game: gameValue(tournament.game),
        matches: tournament.matches.map((match) => ({
          boardCode: match.boardCode,
          players: match.players.map(playerValue),
          results: match.results.map((result) =>
            result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null,
          ),
          round: match.round,
          winner: playerValue(match.winner),
        })),
        playerCount: tournament.playerCount,
        players: tournament.players.map(playerValue),
      },
      version: TOURNAMENT_VERSION,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): Tournament | null {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  return decodeTournamentValue(parseJson(text));
}

export function tournamentLoadNotice(text: string): string {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  const field = findTournamentUnknownField(value);
  return field ? `Unknown field: ${field}.` : 'Invalid tournament JSON.';
}

function playerValue(player: Tournament['champion']) {
  return player ? { name: player.name, seed: player.seed } : null;
}

function gameValue(game: Tournament['game']) {
  if (!game) return null;
  const selection = game.selection;
  const selectionValue =
    selection.kind === 'closed'
      ? { kind: selection.kind }
      : selection.kind === 'one'
        ? { index: selection.index, kind: selection.kind }
        : {
            first: selection.first,
            kind: selection.kind,
            remainingMs: Math.ceil(selection.remainingMs),
            second: selection.second,
          };
  return {
    boardCode: game.boardCode,
    elapsedMs: Math.floor(game.elapsedMs),
    matched: [...game.matched].sort((left, right) => left - right),
    moves: game.moves,
    selection: selectionValue,
    started: game.started,
    version: 1,
  };
}
