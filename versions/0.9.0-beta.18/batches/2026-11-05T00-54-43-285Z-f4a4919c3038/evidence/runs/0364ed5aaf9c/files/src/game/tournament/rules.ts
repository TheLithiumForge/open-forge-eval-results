import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export const TournamentPhase = {
  ready: 'ready',
  playing: 'playing',
  finished: 'finished',
} as const;
type Phase = (typeof TournamentPhase)[keyof typeof TournamentPhase];
export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Tournament {
  readonly names: readonly string[];
  readonly deals: readonly string[];
  readonly results: readonly TurnResult[];
  readonly phase: Phase;
  readonly game: GameState;
}
interface TournamentMatch {
  readonly round: string;
  readonly size: number;
  readonly boardCode: string;
  readonly players: readonly (number | null)[];
  readonly results: readonly (TurnResult | null)[];
  readonly winner: number | null;
}
interface TournamentSetup {
  readonly names: readonly string[];
}
export type TournamentState = Tournament | TournamentSetup;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameProblem(names: readonly string[]): string | null {
  const accepted = names.map(normalizeName);
  if (accepted.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(accepted.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return null;
}

export function tournamentStages(count: number): readonly { round: string; size: number }[] {
  const stages = [];
  if (count === 8)
    for (let index = 0; index < 4; index++) stages.push({ round: 'Quarterfinal', size: 4 });
  for (let index = 0; index < 2; index++) stages.push({ round: 'Semifinal', size: 6 });
  stages.push({ round: 'Final', size: 8 });
  return stages;
}

function winner(players: readonly (number | null)[], results: readonly (TurnResult | null)[]) {
  const [left, right] = results;
  const [first, second] = players;
  if (!left || !right || first == null || second == null) return null;
  const comparison = left.moves - right.moves || left.elapsedMs - right.elapsedMs || first - second;
  return comparison <= 0 ? first : second;
}

export function tournamentBracket(tournament: Tournament): readonly TournamentMatch[] {
  const seeds = tournament.names.length === 4 ? [0, 3, 1, 2] : [0, 7, 3, 4, 2, 5, 1, 6];
  const opening = seeds.length / 2;
  const matches: TournamentMatch[] = [];
  for (const [index, stage] of tournamentStages(tournament.names.length).entries()) {
    const source = (index - opening) * 2;
    const players =
      index < opening
        ? [seeds[index * 2] ?? null, seeds[index * 2 + 1] ?? null]
        : [matches[source]?.winner ?? null, matches[source + 1]?.winner ?? null];
    const results = [
      tournament.results[index * 2] ?? null,
      tournament.results[index * 2 + 1] ?? null,
    ];
    matches.push({
      ...stage,
      boardCode: tournament.deals[index] ?? '',
      players,
      results,
      winner: winner(players, results),
    });
  }
  return matches;
}

export function createTournament(names: readonly string[], deals: readonly string[]): Tournament {
  const code = deals[0];
  if ((names.length !== 4 && names.length !== 8) || nameProblem(names) || !code)
    throw new Error('Invalid tournament setup.');
  return {
    names: names.map(normalizeName),
    deals: [...deals],
    results: [],
    phase: TournamentPhase.ready,
    game: createGame(code),
  };
}

export function isTournamentComplete(tournament: Tournament): boolean {
  return tournament.results.length === tournament.deals.length * 2;
}

export function finishTournamentTurn(tournament: Tournament, game: GameState): Tournament {
  if (
    tournament.phase !== TournamentPhase.playing ||
    !isWon(game) ||
    game.boardCode !== tournament.game.boardCode
  )
    return tournament;
  return {
    ...tournament,
    game,
    phase: TournamentPhase.finished,
    results: [...tournament.results, { moves: game.moves, elapsedMs: game.elapsedMs }],
  };
}

export function nextTournamentTurn(tournament: Tournament): Tournament {
  if (tournament.phase !== TournamentPhase.finished || isTournamentComplete(tournament))
    return tournament;
  const code = tournament.deals[Math.floor(tournament.results.length / 2)];
  if (!code) return tournament;
  return { ...tournament, phase: TournamentPhase.ready, game: createGame(code) };
}
