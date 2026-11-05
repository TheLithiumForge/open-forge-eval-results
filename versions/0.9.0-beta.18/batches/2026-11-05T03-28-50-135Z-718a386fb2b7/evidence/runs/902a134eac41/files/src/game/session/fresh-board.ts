import { boardCode, SEED_MAX } from '../deck.ts';

const UINT32_RANGE = 2 ** 32;
const RANDOM_LIMIT = Math.floor(UINT32_RANGE / SEED_MAX) * SEED_MAX;

function freshSeed(excludedSeeds: ReadonlySet<number>): number {
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const draw = buffer[0];
    if (draw === undefined || draw >= RANDOM_LIMIT) continue;
    const seed = (draw % SEED_MAX) + 1;
    if (!excludedSeeds.has(seed)) return seed;
  }
}

export function freshBoardCode(size: number, previousSeed?: number): string {
  const excludedSeeds = new Set(previousSeed === undefined ? [] : [previousSeed]);
  return boardCode(size, freshSeed(excludedSeeds));
}

export function freshBoardCodes(sizes: readonly number[]): readonly string[] {
  const usedSeeds = new Map<number, Set<number>>();
  return sizes.map((size) => {
    const excludedSeeds = usedSeeds.get(size) ?? new Set<number>();
    const seed = freshSeed(excludedSeeds);
    excludedSeeds.add(seed);
    usedSeeds.set(size, excludedSeeds);
    return boardCode(size, seed);
  });
}
