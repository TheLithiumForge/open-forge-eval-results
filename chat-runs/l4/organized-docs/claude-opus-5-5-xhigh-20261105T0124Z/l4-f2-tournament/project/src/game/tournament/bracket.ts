// The bracket's shape: entry-order seeds, round names and the board size of each round.
export const PLAYER_COUNTS = [4, 8] as const;
export const Round = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type RoundName = (typeof Round)[keyof typeof Round];
const ROUND_BOARD_SIZES: Readonly<Record<RoundName, number>> = {
  [Round.quarterfinal]: 4,
  [Round.semifinal]: 6,
  [Round.final]: 8,
};
// Seeds follow entry order. Each list is the opening bracket in its displayed order.
const OPENING_SEEDS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  4: [
    [1, 4],
    [2, 3],
  ],
  8: [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ],
};

export function roundNames(count: number): readonly RoundName[] {
  return count === 8
    ? [Round.quarterfinal, Round.semifinal, Round.final]
    : [Round.semifinal, Round.final];
}

// Finds a match's round, its position in that round and where the previous round starts.
export function matchPlace(count: number, index: number) {
  let start = 0;
  let size = count / 2;
  let round = 0;
  while (index >= start + size && size > 1) {
    start += size;
    size /= 2;
    round += 1;
  }
  return { round, position: index - start, previousStart: start - size * 2 };
}

export function matchRound(count: number, index: number): RoundName {
  const name = roundNames(count)[matchPlace(count, index).round];
  if (!name) throw new Error('Invalid match.');
  return name;
}

export function matchBoardSize(count: number, index: number): number {
  return ROUND_BOARD_SIZES[matchRound(count, index)];
}

export function openingSeeds(count: number, position: number): readonly number[] | null {
  return OPENING_SEEDS[count]?.[position] ?? null;
}
