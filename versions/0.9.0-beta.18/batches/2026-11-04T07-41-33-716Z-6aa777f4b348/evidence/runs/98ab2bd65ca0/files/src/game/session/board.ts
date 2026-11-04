import { createGame } from "../create.ts";
import type { BoardSize } from "../board/sizes.ts";

const MAX_SEED = 2147483646;

export function randomSeed(): number {
  try {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    const value = values[0];
    if (value !== undefined) return (value % MAX_SEED) + 1;
  } catch {
    // Some file origins do not expose Web Crypto.
  }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

export function boardCode(size: BoardSize, source: () => number, previous?: string): string {
  let seed = Math.floor(source());
  if (!Number.isFinite(seed) || seed < 1 || seed > MAX_SEED) seed = randomSeed();
  const priorSeed = previous?.split("-")[2];
  if (String(seed) === priorSeed) seed = seed === MAX_SEED ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}

export function gameFor(code: string) {
  const game = createGame(code);
  if (game === null) throw new Error("Generated a board code that is not valid.");
  return game;
}

export function startNow(clock: (() => number) | undefined): number {
  const value = clock?.() ?? performance.now();
  return Number.isFinite(value) ? value : 0;
}
