import type { TournamentMatch, TournamentRound, TournamentState } from './model.ts';

export interface MatchSpec {
  readonly round: TournamentRound;
  readonly matchNumber: number;
  readonly size: number;
  readonly playerSeeds: readonly [number | null, number | null];
  readonly feeders: readonly [number, number] | null;
}

export function matchSpecs(count: number): MatchSpec[] {
  const opening: readonly (readonly [number, number])[] =
    count === 4
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
  const round: TournamentRound = count === 4 ? 'Semifinal' : 'Quarterfinal';
  const openingSize = count === 4 ? 6 : 4;
  const specs: MatchSpec[] = opening.map((pair, index) => ({
    round,
    matchNumber: index + 1,
    size: openingSize,
    playerSeeds: pair,
    feeders: null,
  }));
  if (count === 4) {
    specs.push({
      round: 'Final',
      matchNumber: 1,
      size: 8,
      playerSeeds: [null, null],
      feeders: [0, 1],
    });
  } else {
    specs.push(
      { round: 'Semifinal', matchNumber: 1, size: 6, playerSeeds: [null, null], feeders: [0, 1] },
      { round: 'Semifinal', matchNumber: 2, size: 6, playerSeeds: [null, null], feeders: [2, 3] },
      { round: 'Final', matchNumber: 1, size: 8, playerSeeds: [null, null], feeders: [4, 5] },
    );
  }
  return specs;
}

export function makeMatches(
  specs: readonly MatchSpec[],
  codes: readonly string[],
): TournamentMatch[] {
  return specs.map((spec, index): TournamentMatch => ({
    ...spec,
    boardCode: codes[index] ?? '',
    results: [null, null],
    winnerSeed: null,
  }));
}

export function feedMatch(state: TournamentState, index: number): TournamentState {
  const match = state.matches[index];
  if (!match || !match.feeders) return state;
  const first = state.matches[match.feeders[0]]?.winnerSeed;
  const second = state.matches[match.feeders[1]]?.winnerSeed;
  if (first === undefined || first === null || second === undefined || second === null)
    return state;
  const playerSeeds: readonly [number, number] = [first, second];
  const matches = state.matches.map((item, itemIndex) =>
    itemIndex === index ? { ...item, playerSeeds } : item,
  );
  return { ...state, matches };
}
