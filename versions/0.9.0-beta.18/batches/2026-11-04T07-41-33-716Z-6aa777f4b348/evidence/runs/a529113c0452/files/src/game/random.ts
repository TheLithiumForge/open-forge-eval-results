const MODULUS = 2_147_483_647;
const RANDOM_VALUES = MODULUS - 1;

export function nextRandomState(state: number): number {
  // The largest product is below 2^53, so integer multiplication is exact.
  return (state * 16_807) % MODULUS;
}

export function boundedRandom(state: number, bound: number): Readonly<{ state: number; value: number }> {
  const limit = Math.floor(RANDOM_VALUES / bound) * bound;
  let next = state;
  do {
    next = nextRandomState(next);
  } while (next - 1 >= limit);
  return { state: next, value: (next - 1) % bound };
}
