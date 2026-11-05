export const COMPLETED_TOURNAMENT_RECORD = {
  startedAtMs: 1,
  completedAtMs: 2,
  players: [
    { seed: 1, name: 'Ada' },
    { seed: 2, name: 'Bo' },
    { seed: 3, name: 'Cora' },
    { seed: 4, name: 'Dev' },
  ],
  rounds: [
    {
      name: 'Semifinal',
      size: 6,
      matches: [
        {
          boardCode: 'np1-6-11',
          players: [1, 4],
          results: [
            { moves: 18, elapsedMs: 10 },
            { moves: 20, elapsedMs: 11 },
          ],
          winnerSeed: 1,
        },
        {
          boardCode: 'np1-6-12',
          players: [2, 3],
          results: [
            { moves: 19, elapsedMs: 11 },
            { moves: 18, elapsedMs: 12 },
          ],
          winnerSeed: 3,
        },
      ],
    },
    {
      name: 'Final',
      size: 8,
      matches: [
        {
          boardCode: 'np1-8-13',
          players: [1, 3],
          results: [
            { moves: 32, elapsedMs: 20 },
            { moves: 33, elapsedMs: 21 },
          ],
          winnerSeed: 1,
        },
      ],
    },
  ],
  championSeed: 1,
} as const;
