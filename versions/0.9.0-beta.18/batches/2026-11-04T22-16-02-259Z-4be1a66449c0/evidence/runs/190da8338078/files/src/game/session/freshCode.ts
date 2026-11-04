import type { BoardSize } from '../types.ts';

const MAX_SEED = 2_147_483_646;
const RANGE = 4_294_967_296;
const ACCEPT_LIMIT = Math.floor(RANGE / MAX_SEED) * MAX_SEED;

export function freshBoardCode(size: BoardSize): string {
  let seed: number;
  try {
    const cryptoSource = globalThis.crypto;
    if (!cryptoSource) throw new Error('No cryptographic random source.');
    const values = new Uint32Array(1);
    let randomValue = values.at(0);
    if (randomValue === undefined) throw new Error('No random value was returned.');
    do {
      cryptoSource.getRandomValues(values);
      randomValue = values.at(0);
      if (randomValue === undefined) throw new Error('No random value was returned.');
    } while (randomValue >= ACCEPT_LIMIT);
    seed = randomValue % MAX_SEED + 1;
  } catch {
    seed = Math.floor(Math.random() * MAX_SEED) + 1;
  }
  return `np1-${size}-${seed}`;
}
