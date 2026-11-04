const SEED_RANGE = 2_147_483_646;

export function createSeed(): number {
  const source = globalThis.crypto;
  if (source !== undefined && typeof source.getRandomValues === "function") {
    const range = 0x1_0000_0000;
    const limit = Math.floor(range / SEED_RANGE) * SEED_RANGE;
    const values = new Uint32Array(1);
    do {
      source.getRandomValues(values);
    } while ((values[0] ?? range) >= limit);
    return ((values[0] ?? 0) % SEED_RANGE) + 1;
  }
  return Math.floor(Math.random() * SEED_RANGE) + 1;
}
