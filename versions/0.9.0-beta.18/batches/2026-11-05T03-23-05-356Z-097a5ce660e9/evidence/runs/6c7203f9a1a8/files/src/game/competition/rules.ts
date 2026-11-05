import { isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export type PlayerCount = 4 | 8;
export type RoundName = 'Quarterfinal' | 'Semifinal' | 'Final';
export type TournamentPhase = 'ready' | 'playing' | 'next-turn' | 'next-match' | 'complete';

export interface MatchResult {
  readonly elapsedMs: number;
  readonly moves: number;
  readonly name: string;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [string | null, string | null];
  readonly results: readonly [MatchResult | null, MatchResult | null];
  readonly winner: string | null;
}

export interface TournamentRound {
  readonly matches: readonly TournamentMatch[];
  readonly name: RoundName;
  readonly size: number;
}

export interface Tournament {
  readonly matchIndex: number;
  readonly playerCount: PlayerCount;
  readonly playerIndex: 0 | 1;
  readonly phase: TournamentPhase;
  readonly players: readonly string[];
  readonly roundIndex: number;
  readonly rounds: readonly TournamentRound[];
}

export function tournamentMatch(tournament: Tournament): TournamentMatch | undefined {
  return tournament.rounds[tournament.roundIndex]?.matches[tournament.matchIndex];
}

export function tournamentPlayer(tournament: Tournament): string | undefined {
  return tournamentMatch(tournament)?.players[tournament.playerIndex] ?? undefined;
}

export function startTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'ready' &&
    tournamentMatch(tournament)?.players[tournament.playerIndex]
    ? { ...tournament, phase: 'playing' }
    : tournament;
}

export function compareResults(
  left: MatchResult,
  right: MatchResult,
  leftSeed: number,
  rightSeed: number,
): number {
  if (left.moves !== right.moves) return left.moves < right.moves ? -1 : 1;
  if (left.elapsedMs !== right.elapsedMs) return left.elapsedMs < right.elapsedMs ? -1 : 1;
  return leftSeed < rightSeed ? -1 : leftSeed > rightSeed ? 1 : 0;
}

export function finishTurn(tournament: Tournament, game: GameState): Tournament {
  if (tournament.phase !== 'playing' || !isWon(game)) return tournament;
  const round = tournament.rounds[tournament.roundIndex];
  const match = tournamentMatch(tournament);
  const name = tournamentPlayer(tournament);
  if (!round || !match || !name) return tournament;
  const results: [MatchResult | null, MatchResult | null] = [match.results[0], match.results[1]];
  results[tournament.playerIndex] = { elapsedMs: game.elapsedMs, moves: game.moves, name };
  if (tournament.playerIndex === 0) {
    return {
      ...tournament,
      phase: 'next-turn',
      rounds: replaceMatch(tournament.rounds, tournament.roundIndex, tournament.matchIndex, {
        ...match,
        results,
      }),
    };
  }
  const first = results[0];
  const second = results[1];
  const firstName = match.players[0];
  const secondName = match.players[1];
  if (!first || !second || !firstName || !secondName) return tournament;
  const winner =
    compareResults(
      first,
      second,
      tournament.players.indexOf(firstName),
      tournament.players.indexOf(secondName),
    ) <= 0
      ? firstName
      : secondName;
  let rounds = replaceMatch(tournament.rounds, tournament.roundIndex, tournament.matchIndex, {
    ...match,
    results,
    winner,
  });
  const finalMatch =
    tournament.roundIndex === rounds.length - 1 &&
    tournament.matchIndex === round.matches.length - 1;
  if (!finalMatch) {
    const targetRound = rounds[tournament.roundIndex + 1];
    if (targetRound) {
      const targetIndex = Math.floor(tournament.matchIndex / 2);
      const target = targetRound.matches[targetIndex];
      if (target) {
        const players: [string | null, string | null] = [target.players[0], target.players[1]];
        players[tournament.matchIndex % 2] = winner;
        rounds = replaceMatch(rounds, tournament.roundIndex + 1, targetIndex, {
          ...target,
          players,
        });
      }
    }
    return {
      ...tournament,
      phase: 'next-match',
      rounds,
      roundIndex: tournament.roundIndex,
      matchIndex: tournament.matchIndex,
    };
  }
  return { ...tournament, phase: 'complete', rounds };
}

function replaceMatch(
  rounds: readonly TournamentRound[],
  roundIndex: number,
  matchIndex: number,
  match: TournamentMatch,
): readonly TournamentRound[] {
  return rounds.map((round, index) =>
    index === roundIndex
      ? {
          ...round,
          matches: round.matches.map((entry, itemIndex) =>
            itemIndex === matchIndex ? match : entry,
          ),
        }
      : round,
  );
}

export function nextTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'next-turn'
    ? { ...tournament, phase: 'ready', playerIndex: 1 }
    : tournament;
}

export function nextMatch(tournament: Tournament): Tournament {
  if (tournament.phase !== 'next-match') return tournament;
  const round = tournament.rounds[tournament.roundIndex];
  if (!round) return tournament;
  const atEnd = tournament.matchIndex === round.matches.length - 1;
  return atEnd
    ? {
        ...tournament,
        phase: 'ready',
        roundIndex: tournament.roundIndex + 1,
        matchIndex: 0,
        playerIndex: 0,
      }
    : { ...tournament, phase: 'ready', matchIndex: tournament.matchIndex + 1, playerIndex: 0 };
}
