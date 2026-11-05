import type { TournamentPlayerCount, TournamentRound, TournamentResult } from './types.ts';

export interface MatchPlan {
  readonly id: string;
  readonly number: number;
  readonly round: TournamentRound;
  readonly size: 4 | 6 | 8;
  readonly openingPlayers: readonly [number | null, number | null];
  readonly sources: readonly [number | null, number | null];
}

export type NameValidation =
  | { readonly ok: true; readonly names: readonly string[] }
  | { readonly ok: false; readonly error: string };

export const TournamentNameError = {
  length: 'Use 2 to 20 characters.',
  duplicate: 'Each name must be different.',
} as const;

export function normalizePlayerNames(
  drafts: readonly string[],
  playerCount: TournamentPlayerCount,
): NameValidation {
  const names = Array.from({ length: playerCount }, (_, index) =>
    (drafts[index] ?? '').trim().replace(/\s+/gu, ' ').normalize('NFC'),
  );
  if (names.some((name) => Array.from(name).length < 2 || Array.from(name).length > 20)) {
    return { ok: false, error: TournamentNameError.length };
  }
  const comparisonNames = names.map((name) => name.toLowerCase());
  if (new Set(comparisonNames).size !== names.length) {
    return { ok: false, error: TournamentNameError.duplicate };
  }
  return { ok: true, names };
}

export function tournamentMatchPlans(playerCount: TournamentPlayerCount): readonly MatchPlan[] {
  if (playerCount === 4) {
    return [
      {
        id: 'S1',
        number: 1,
        round: 'Semifinal',
        size: 6,
        openingPlayers: [1, 4],
        sources: [null, null],
      },
      {
        id: 'S2',
        number: 2,
        round: 'Semifinal',
        size: 6,
        openingPlayers: [2, 3],
        sources: [null, null],
      },
      {
        id: 'F1',
        number: 1,
        round: 'Final',
        size: 8,
        openingPlayers: [null, null],
        sources: [0, 1],
      },
    ];
  }
  return [
    {
      id: 'Q1',
      number: 1,
      round: 'Quarterfinal',
      size: 4,
      openingPlayers: [1, 8],
      sources: [null, null],
    },
    {
      id: 'Q2',
      number: 2,
      round: 'Quarterfinal',
      size: 4,
      openingPlayers: [4, 5],
      sources: [null, null],
    },
    {
      id: 'Q3',
      number: 3,
      round: 'Quarterfinal',
      size: 4,
      openingPlayers: [3, 6],
      sources: [null, null],
    },
    {
      id: 'Q4',
      number: 4,
      round: 'Quarterfinal',
      size: 4,
      openingPlayers: [2, 7],
      sources: [null, null],
    },
    {
      id: 'S1',
      number: 1,
      round: 'Semifinal',
      size: 6,
      openingPlayers: [null, null],
      sources: [0, 1],
    },
    {
      id: 'S2',
      number: 2,
      round: 'Semifinal',
      size: 6,
      openingPlayers: [null, null],
      sources: [2, 3],
    },
    {
      id: 'F1',
      number: 1,
      round: 'Final',
      size: 8,
      openingPlayers: [null, null],
      sources: [4, 5],
    },
  ];
}

// A lower move count wins, then a lower active time, then the higher seed (seed 1).
export function winningSeed(
  seeds: readonly [number, number],
  results: readonly [TournamentResult, TournamentResult],
): number {
  if (results[0].moves !== results[1].moves) {
    return results[0].moves < results[1].moves ? seeds[0] : seeds[1];
  }
  if (results[0].elapsedMs !== results[1].elapsedMs) {
    return results[0].elapsedMs < results[1].elapsedMs ? seeds[0] : seeds[1];
  }
  return Math.min(seeds[0], seeds[1]);
}
