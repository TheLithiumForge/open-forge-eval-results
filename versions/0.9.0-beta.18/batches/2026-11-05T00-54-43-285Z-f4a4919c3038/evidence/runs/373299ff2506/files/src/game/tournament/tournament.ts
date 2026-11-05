import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface Tournament {
  readonly id: string;
  readonly players: readonly string[];
  readonly boardCodes: readonly string[];
  readonly results: readonly TurnResult[];
  readonly stage: 'ready' | 'playing' | 'turn-complete' | 'match-complete' | 'complete';
  readonly game: GameState | null;
}

interface TournamentMatch {
  readonly round: number;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TurnResult | null, TurnResult | null];
  readonly winner: number | null;
}

function winningPlayer(
  players: TournamentMatch['players'],
  first: TurnResult | null,
  second: TurnResult | null,
): number | null {
  if (!first || !second) return null;
  const difference = first.moves - second.moves || first.elapsedMs - second.elapsedMs;
  return players[difference <= 0 ? 0 : 1];
}

export function tournamentBracket(tournament: Tournament): readonly TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let entrants: readonly (number | null)[] = tournament.players.map((_, index) => index);
  let round = 0;
  while (entrants.length > 1) {
    const winners: (number | null)[] = [];
    for (let index = 0; index < entrants.length; index += 2) {
      const players = [entrants[index] ?? null, entrants[index + 1] ?? null] as const;
      const first = tournament.results[matches.length * 2] ?? null;
      const second = tournament.results[matches.length * 2 + 1] ?? null;
      const winner = winningPlayer(players, first, second);
      matches.push({ round, players, results: [first, second], winner });
      winners.push(winner);
    }
    entrants = winners;
    round += 1;
  }
  return matches;
}

export function createTournament(
  id: string,
  players: readonly string[],
  boardCodes: readonly string[],
): Tournament {
  return { id, players, boardCodes, results: [], stage: 'ready', game: null };
}

export function startTournamentTurn(tournament: Tournament): Tournament {
  if (tournament.stage !== 'ready') return tournament;
  const code = tournament.boardCodes[Math.floor(tournament.results.length / 2)];
  if (!code) return tournament;
  return { ...tournament, stage: 'playing', game: createGame(code) };
}

export function finishTournamentTurn(tournament: Tournament, game: GameState): Tournament {
  if (
    tournament.stage !== 'playing' ||
    game.boardCode !== tournament.game?.boardCode ||
    !isWon(game)
  )
    return tournament;
  const results = [
    ...tournament.results,
    { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) },
  ];
  const stage =
    results.length === tournament.boardCodes.length * 2
      ? 'complete'
      : results.length % 2 === 0
        ? 'match-complete'
        : 'turn-complete';
  return { ...tournament, results, stage, game: null };
}

export function advanceTournament(tournament: Tournament): Tournament {
  return tournament.stage === 'turn-complete' || tournament.stage === 'match-complete'
    ? { ...tournament, stage: 'ready' }
    : tournament;
}
