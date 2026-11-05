import type { PlayerCount, TournamentRound } from './rules.ts';

interface MatchPlan {
  readonly round: TournamentRound;
  readonly number: number;
  readonly size: number;
  readonly playerSeeds: readonly [number | null, number | null];
  readonly advanceTo: { readonly matchIndex: number; readonly slot: 0 | 1 } | null;
}

export function matchPlans(count: PlayerCount): readonly MatchPlan[] {
  if (count === 4)
    return [
      {
        round: 'Semifinal',
        number: 1,
        size: 6,
        playerSeeds: [1, 4],
        advanceTo: { matchIndex: 2, slot: 0 },
      },
      {
        round: 'Semifinal',
        number: 2,
        size: 6,
        playerSeeds: [2, 3],
        advanceTo: { matchIndex: 2, slot: 1 },
      },
      { round: 'Final', number: 1, size: 8, playerSeeds: [null, null], advanceTo: null },
    ];
  return [
    {
      round: 'Quarterfinal',
      number: 1,
      size: 4,
      playerSeeds: [1, 8],
      advanceTo: { matchIndex: 4, slot: 0 },
    },
    {
      round: 'Quarterfinal',
      number: 2,
      size: 4,
      playerSeeds: [4, 5],
      advanceTo: { matchIndex: 4, slot: 1 },
    },
    {
      round: 'Quarterfinal',
      number: 3,
      size: 4,
      playerSeeds: [3, 6],
      advanceTo: { matchIndex: 5, slot: 0 },
    },
    {
      round: 'Quarterfinal',
      number: 4,
      size: 4,
      playerSeeds: [2, 7],
      advanceTo: { matchIndex: 5, slot: 1 },
    },
    {
      round: 'Semifinal',
      number: 1,
      size: 6,
      playerSeeds: [null, null],
      advanceTo: { matchIndex: 6, slot: 0 },
    },
    {
      round: 'Semifinal',
      number: 2,
      size: 6,
      playerSeeds: [null, null],
      advanceTo: { matchIndex: 6, slot: 1 },
    },
    { round: 'Final', number: 1, size: 8, playerSeeds: [null, null], advanceTo: null },
  ];
}
