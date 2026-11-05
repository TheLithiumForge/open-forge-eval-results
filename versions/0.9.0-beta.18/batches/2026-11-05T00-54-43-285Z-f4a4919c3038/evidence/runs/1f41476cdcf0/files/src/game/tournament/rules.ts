import { isWon } from '../game.ts';
import { TournamentPhase } from './types.ts';
import type { GameState } from '../game.ts';
import type { Tournament, TournamentResult } from './types.ts';

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function playerNameErrors(names: readonly string[]): readonly string[] {
  const normalized = names.map(normalizePlayerName);
  return normalized.map((name) => {
    const length = Array.from(name).length;
    if (length < 2 || length > 20) return 'Use 2 to 20 characters.';
    return normalized.filter((other) => other.toLowerCase() === name.toLowerCase()).length > 1
      ? 'Each name must be different.'
      : '';
  });
}

export function tournamentRound(count: number, index: number): { name: string; size: number } {
  if (count === 8 && index < 4) return { name: 'Quarterfinal', size: 4 };
  if (index < count - 2) return { name: 'Semifinal', size: 6 };
  return { name: 'Final', size: 8 };
}

export function createTournament(names: readonly string[], codes: readonly string[]): Tournament {
  return {
    players: names.map(normalizePlayerName),
    matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    matchIndex: 0,
    turn: 0,
    phase: TournamentPhase.ready,
  };
}

export function matchPlayers(tournament: Tournament, index: number): readonly (number | null)[] {
  const count = tournament.players.length;
  const opening =
    count === 4
      ? [
          [0, 3],
          [1, 2],
        ]
      : [
          [0, 7],
          [3, 4],
          [2, 5],
          [1, 6],
        ];
  if (index < count / 2) return opening[index] ?? [];
  const previous =
    index === count - 2
      ? [index - 2, index - 1]
      : [(index - count / 2) * 2, (index - count / 2) * 2 + 1];
  return previous.map((match) => matchWinner(tournament, match));
}

function compareResults(first: TournamentResult, second: TournamentResult): number {
  return first.moves - second.moves || first.elapsedMs - second.elapsedMs;
}

export function matchWinner(tournament: Tournament, index: number): number | null {
  const results = tournament.matches[index]?.results;
  const first = results?.[0];
  const second = results?.[1];
  if (!first || !second) return null;
  const players = matchPlayers(tournament, index);
  const one = players[0];
  const two = players[1];
  if (one == null || two == null) return null;
  const comparison = compareResults(first, second);
  return comparison < 0 ? one : comparison > 0 ? two : Math.min(one, two);
}

export function startTournamentTurn(tournament: Tournament): Tournament {
  return tournament.phase === TournamentPhase.ready
    ? { ...tournament, phase: TournamentPhase.playing }
    : tournament;
}

export function finishTournamentTurn(tournament: Tournament, game: GameState): Tournament {
  const match = tournament.matches[tournament.matchIndex];
  if (
    tournament.phase !== TournamentPhase.playing ||
    !match ||
    !isWon(game) ||
    game.boardCode !== match.boardCode
  )
    return tournament;
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const phase =
    tournament.turn === 0
      ? TournamentPhase.turnComplete
      : tournament.matchIndex === tournament.matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchComplete;
  return {
    ...tournament,
    matches: tournament.matches.map((item, index) =>
      index === tournament.matchIndex ? { ...item, results } : item,
    ),
    phase,
  };
}

export function nextTournamentTurn(tournament: Tournament): Tournament {
  if (tournament.phase === TournamentPhase.turnComplete)
    return { ...tournament, turn: 1, phase: TournamentPhase.ready };
  if (tournament.phase === TournamentPhase.matchComplete)
    return {
      ...tournament,
      matchIndex: tournament.matchIndex + 1,
      turn: 0,
      phase: TournamentPhase.ready,
    };
  return tournament;
}
