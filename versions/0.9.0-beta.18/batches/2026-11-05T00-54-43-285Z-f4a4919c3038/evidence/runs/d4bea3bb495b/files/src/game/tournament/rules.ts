import { boardCode, SEED_MAX } from '../deck.ts';
import { activateCard, createGame, isWon } from '../game.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentMatch, TournamentResult, TournamentState } from './model.ts';

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function playerNamesError(names: readonly string[]): string {
  if (
    names.some(
      (name) =>
        [...normalizePlayerName(name)].length < 2 || [...normalizePlayerName(name)].length > 20,
    )
  )
    return 'Use 2 to 20 characters.';
  const comparison = names.map((name) => normalizePlayerName(name).toLowerCase());
  return new Set(comparison).size === names.length ? '' : 'Each name must be different.';
}

export function tournamentRound(count: number, match: number) {
  if (match === count - 2) return { name: 'Final', size: 8 };
  if (count === 8 && match < 4) return { name: 'Quarterfinal', size: 4 };
  return { name: 'Semifinal', size: 6 };
}

export function createTournament(names: readonly string[], seed: number): TournamentState {
  if ((names.length !== 4 && names.length !== 8) || playerNamesError(names))
    throw new Error('Invalid tournament players.');
  const opening =
    names.length === 4
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
  const matches: TournamentMatch[] = Array.from({ length: names.length - 1 }, (_, index) => ({
    boardCode: boardCode(
      tournamentRound(names.length, index).size,
      ((seed - 1 + index) % SEED_MAX) + 1,
    ),
    players: opening[index] ?? [],
    results: [],
    winner: null,
  }));
  return {
    names: names.map(normalizePlayerName),
    matches,
    currentMatch: 0,
    phase: TournamentPhase.ready,
    game: createGame(matches[0]!.boardCode),
  };
}

export function matchWinner(match: TournamentMatch): number | null {
  const [first, second] = match.results;
  const [a, b] = match.players;
  if (!first || !second || a === undefined || b === undefined) return null;
  const order = first.moves - second.moves || first.elapsedMs - second.elapsedMs || a - b;
  return order <= 0 ? a : b;
}

export function currentPlayer(tournament: TournamentState): number {
  const match = tournament.matches[tournament.currentMatch]!;
  const second = match.results.length > 0 && tournament.phase !== TournamentPhase.turnComplete;
  return match.players[second ? 1 : 0]!;
}

export function startTournamentTurn(tournament: TournamentState): TournamentState {
  return tournament.phase === TournamentPhase.ready
    ? { ...tournament, phase: TournamentPhase.playing }
    : tournament;
}

export function recordTournamentTurn(
  tournament: TournamentState,
  result: TournamentResult,
): TournamentState {
  const match = tournament.matches[tournament.currentMatch]!;
  const results = [...match.results, result];
  const finished = { ...match, results };
  const winner = matchWinner(finished);
  const matches = tournament.matches.map((entry, index) =>
    index === tournament.currentMatch ? { ...finished, winner } : entry,
  );
  // Adjacent matches feed the next round in their displayed order.
  const openingCount = tournament.names.length / 2;
  if (winner !== null && tournament.currentMatch < matches.length - 1) {
    const nextIndex = openingCount + Math.floor(tournament.currentMatch / 2);
    const next = matches[nextIndex]!;
    matches[nextIndex] = { ...next, players: [...next.players, winner] };
  }
  const phase =
    winner === null
      ? TournamentPhase.turnComplete
      : tournament.currentMatch === matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchComplete;
  return { ...tournament, matches, phase };
}

export function playTournamentCard(tournament: TournamentState, index: number): TournamentState {
  if (tournament.phase !== TournamentPhase.playing) return tournament;
  const game = activateCard(tournament.game, index);
  if (game === tournament.game) return tournament;
  const next = { ...tournament, game };
  return isWon(game)
    ? recordTournamentTurn(next, { moves: game.moves, elapsedMs: game.elapsedMs })
    : next;
}

export function advanceTournament(tournament: TournamentState): TournamentState {
  const phase = tournament.phase;
  if (phase !== TournamentPhase.turnComplete && phase !== TournamentPhase.matchComplete)
    return tournament;
  const currentMatch = tournament.currentMatch + (phase === TournamentPhase.matchComplete ? 1 : 0);
  return {
    ...tournament,
    currentMatch,
    phase: TournamentPhase.ready,
    game: createGame(tournament.matches[currentMatch]!.boardCode),
  };
}
