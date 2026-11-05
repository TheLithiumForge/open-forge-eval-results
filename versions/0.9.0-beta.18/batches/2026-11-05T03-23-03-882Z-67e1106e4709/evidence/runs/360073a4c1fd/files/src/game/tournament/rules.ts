import type { GameState } from '../game.ts';
import { isWon } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  turnOver: 'turnOver',
  matchOver: 'matchOver',
  complete: 'complete',
} as const;
export type TournamentPhase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Match {
  readonly boardCode: string;
  readonly results: readonly Result[];
}
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
  readonly matchIndex: number;
  readonly phase: TournamentPhase;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameProblem(players: readonly string[]): string | null {
  if (
    players.some(
      (name) => [...normalizeName(name)].length < 2 || [...normalizeName(name)].length > 20,
    )
  )
    return 'Use 2 to 20 characters.';
  if (new Set(players.map((name) => normalizeName(name).toLowerCase())).size !== players.length)
    return 'Each name must be different.';
  return null;
}

export function matchSizes(count: number): readonly number[] {
  return count === 8 ? [4, 4, 4, 4, 6, 6, 8] : [6, 6, 8];
}

export function roundName(size: number): string {
  return size === 4 ? 'Quarterfinal' : size === 6 ? 'Semifinal' : 'Final';
}

export function createTournament(players: readonly string[], codes: readonly string[]): Tournament {
  return {
    players: players.map(normalizeName),
    matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    matchIndex: 0,
    phase: TournamentPhase.ready,
  };
}

// Player indices are seeds minus one. Later matches join adjacent earlier winners.
export function matchPlayers(tournament: Tournament, index: number): readonly (number | null)[] {
  const opening = tournament.players.length / 2;
  if (index < opening) {
    const pairs =
      opening === 4
        ? [
            [0, 7],
            [3, 4],
            [2, 5],
            [1, 6],
          ]
        : [
            [0, 3],
            [1, 2],
          ];
    return pairs[index] ?? [];
  }
  const first = (index - opening) * 2;
  return [matchWinner(tournament, first), matchWinner(tournament, first + 1)];
}

export function matchWinner(tournament: Tournament, index: number): number | null {
  const results = tournament.matches[index]?.results;
  const first = results?.[0];
  const second = results?.[1];
  if (!first || !second) return null;
  const players = matchPlayers(tournament, index);
  const left = players[0];
  const right = players[1];
  if (left == null || right == null) return null;
  const difference =
    first.moves - second.moves || first.elapsedMs - second.elapsedMs || left - right;
  return difference <= 0 ? left : right;
}

export function finishTurn(tournament: Tournament, game: GameState): Tournament {
  const match = tournament.matches[tournament.matchIndex];
  if (
    tournament.phase !== TournamentPhase.playing ||
    !match ||
    match.boardCode !== game.boardCode ||
    !isWon(game)
  )
    return tournament;
  const results = [...match.results, { moves: game.moves, elapsedMs: game.elapsedMs }];
  const phase =
    results.length === 1
      ? TournamentPhase.turnOver
      : tournament.matchIndex === tournament.matches.length - 1
        ? TournamentPhase.complete
        : TournamentPhase.matchOver;
  return {
    ...tournament,
    phase,
    matches: tournament.matches.map((item, index) =>
      index === tournament.matchIndex ? { ...match, results } : item,
    ),
  };
}

export function nextTurn(tournament: Tournament): Tournament {
  if (tournament.phase === TournamentPhase.turnOver)
    return { ...tournament, phase: TournamentPhase.ready };
  if (tournament.phase === TournamentPhase.matchOver)
    return { ...tournament, matchIndex: tournament.matchIndex + 1, phase: TournamentPhase.ready };
  return tournament;
}
