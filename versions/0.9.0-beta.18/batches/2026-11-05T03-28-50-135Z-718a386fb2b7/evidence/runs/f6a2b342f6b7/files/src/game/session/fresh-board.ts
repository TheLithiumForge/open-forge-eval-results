import { boardCode, SEED_MAX } from '../deck.ts';

const UINT32_RANGE = 2 ** 32;
const RANDOM_LIMIT = Math.floor(UINT32_RANGE / SEED_MAX) * SEED_MAX;

export function freshBoardCode(
  size: number,
  previousSeed?: number,
  usedCodes: readonly string[] = [],
): string {
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const draw = buffer[0];
    if (draw === undefined || draw >= RANDOM_LIMIT) continue;
    const seed = (draw % SEED_MAX) + 1;
    const code = boardCode(size, seed);
    if (seed !== previousSeed && !usedCodes.includes(code)) return code;
  }
}
