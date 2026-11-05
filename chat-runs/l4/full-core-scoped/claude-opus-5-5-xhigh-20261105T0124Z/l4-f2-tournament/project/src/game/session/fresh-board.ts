import { boardCode, SEED_MAX } from '../deck.ts';

const UINT32_RANGE = 2 ** 32;
const RANDOM_LIMIT = Math.floor(UINT32_RANGE / SEED_MAX) * SEED_MAX;

export function freshBoardCode(size: number, previousSeed?: number): string {
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const draw = buffer[0];
    if (draw === undefined || draw >= RANDOM_LIMIT) continue;
    const seed = (draw % SEED_MAX) + 1;
    if (seed !== previousSeed) return boardCode(size, seed);
  }
}

// A tournament gives every match its own deal, so it retries until the code is new to the event.
export function unusedBoardCode(size: number, used: ReadonlySet<string>): string {
  for (;;) {
    const code = freshBoardCode(size);
    if (!used.has(code)) return code;
  }
}
