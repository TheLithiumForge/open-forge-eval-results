import { MAX_SEED } from "../constants.ts";

export function newSeed(currentSeed?: number): number {
  let candidate = 0;
  try {
    const value = new Uint32Array(1);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      globalThis.crypto.getRandomValues(value);
      candidate = (value[0] ?? 0) % MAX_SEED + 1;
      if (candidate !== currentSeed) return candidate;
    }
  } catch {
    candidate = 0;
  }
  if (candidate !== 0 && candidate !== currentSeed) return candidate;
  return currentSeed === MAX_SEED ? 1 : (currentSeed ?? 0) + 1;
}
