import { isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnFinished: 'turn-finished',
  matchFinished: 'match-finished',
  completed: 'completed',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface TournamentScore {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TournamentScore[];
}
export interface TournamentState {
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly phase: Phase;
}

export function roundForMatch(count: number, index: number) {
  if (count === 8 && index < 4) return { name: 'Quarterfinal', size: 4 };
  if (index < count - 2) return { name: 'Semifinal', size: 6 };
  return { name: 'Final', size: 8 };
}

export function createTournament(
  players: readonly string[],
  codes: readonly string[],
): TournamentState {
  return {
    players: [...players],
    matches: codes.map((code) => ({ boardCode: code, results: [] })),
    currentMatch: 0,
    phase: TournamentPhase.ready,
  };
}

export function matchPlayers(
  tournament: TournamentState,
  index: number,
): readonly (number | null)[] {
  const opening = tournament.players.length / 2;
  const pairs =
    tournament.players.length === 4
      ? [
          [1, 4],
          [2, 3],
        ]
      : [
          [1, 8],
          [4, 5],
          [3, 6],
          [2, 7],
        ];
  if (index < opening) return pairs[index] ?? [null, null];
  const previous = (index - opening) * 2;
  return [matchWinner(tournament, previous), matchWinner(tournament, previous + 1)];
}

export function matchWinner(tournament: TournamentState, index: number): number | null {
  const match = tournament.matches[index];
  const first = match?.results[0];
  const second = match?.results[1];
  if (!first || !second) return null;
  const [a, b] = matchPlayers(tournament, index);
  if (a == null || b == null) return null;
  const difference = first.moves - second.moves || first.elapsedMs - second.elapsedMs || a - b;
  return difference <= 0 ? a : b;
}

export function currentPlayer(tournament: TournamentState): string {
  const match = tournament.matches[tournament.currentMatch];
  if (!match) return '';
  const finished =
    tournament.phase === TournamentPhase.turnFinished ||
    tournament.phase === TournamentPhase.matchFinished ||
    tournament.phase === TournamentPhase.completed;
  const turn = match.results.length - (finished ? 1 : 0);
  const seed = matchPlayers(tournament, tournament.currentMatch)[turn];
  return seed == null ? '' : (tournament.players[seed - 1] ?? '');
}

export function beginTurn(tournament: TournamentState): TournamentState {
  return tournament.phase === TournamentPhase.ready
    ? { ...tournament, phase: TournamentPhase.playing }
    : tournament;
}

export function finishTurn(tournament: TournamentState, game: GameState): TournamentState {
  const match = tournament.matches[tournament.currentMatch];
  if (
    tournament.phase !== TournamentPhase.playing ||
    !match ||
    game.boardCode !== match.boardCode ||
    !isWon(game)
  )
    return tournament;
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const matches = tournament.matches.map((item, index) =>
    index === tournament.currentMatch ? { ...item, results } : item,
  );
  const phase =
    results.length === 1
      ? TournamentPhase.turnFinished
      : tournament.currentMatch === matches.length - 1
        ? TournamentPhase.completed
        : TournamentPhase.matchFinished;
  return { ...tournament, matches, phase };
}

export function advanceTournament(tournament: TournamentState): TournamentState {
  if (tournament.phase === TournamentPhase.turnFinished)
    return { ...tournament, phase: TournamentPhase.ready };
  if (tournament.phase === TournamentPhase.matchFinished)
    return {
      ...tournament,
      currentMatch: tournament.currentMatch + 1,
      phase: TournamentPhase.ready,
    };
  return tournament;
}
