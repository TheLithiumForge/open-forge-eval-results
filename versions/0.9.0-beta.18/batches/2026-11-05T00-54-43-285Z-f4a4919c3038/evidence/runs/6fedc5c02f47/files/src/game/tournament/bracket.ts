import type { TournamentRecord, TurnResult } from './tournament.ts';

interface BracketMatch {
  readonly index: number;
  readonly round: number;
  readonly players: readonly [number | null, number | null];
  readonly sources: readonly [number | null, number | null];
  readonly winner: number | null;
}

function winningTurn(results: readonly TurnResult[]): number | null {
  const [first, second] = results;
  if (!first || !second) return null;
  if (first.moves !== second.moves) return first.moves < second.moves ? 0 : 1;
  if (first.elapsedMs !== second.elapsedMs) return first.elapsedMs < second.elapsedMs ? 0 : 1;
  return null;
}

export function tournamentBracket(tournament: TournamentRecord): readonly BracketMatch[] {
  const bracket: BracketMatch[] = [];
  let players: readonly (number | null)[] = tournament.players.map((_, index) => index);
  let sources: readonly (number | null)[] = players.map(() => null);
  let round = 0;
  while (players.length > 1) {
    const winners: (number | null)[] = [];
    const nextSources: number[] = [];
    for (let offset = 0; offset < players.length; offset += 2) {
      const index = bracket.length;
      const entrants: readonly [number | null, number | null] = [
        players[offset] ?? null,
        players[offset + 1] ?? null,
      ];
      const turn = winningTurn(tournament.matches[index]?.results ?? []);
      const winner = turn === null ? null : (entrants[turn] ?? null);
      bracket.push({
        index,
        round,
        players: entrants,
        sources: [sources[offset] ?? null, sources[offset + 1] ?? null],
        winner,
      });
      winners.push(winner);
      nextSources.push(index);
    }
    players = winners;
    sources = nextSources;
    round += 1;
  }
  return bracket;
}
