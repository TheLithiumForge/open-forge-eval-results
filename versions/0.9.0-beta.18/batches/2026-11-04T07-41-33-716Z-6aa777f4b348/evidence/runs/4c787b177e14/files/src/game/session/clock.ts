import { MAX_ELAPSED_MS } from "../constants.ts";

export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(Math.min(milliseconds, MAX_ELAPSED_MS) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function makeFreshBoardCode(size: number, previousSeed?: number): string {
  const ceiling = 2_147_483_646;
  const bytes = new Uint32Array(1);
  let seed = 0;
  try {
    globalThis.crypto.getRandomValues(bytes);
    const value = bytes[0];
    seed = value === undefined ? 0 : (value % ceiling) + 1;
  } catch {
    seed = 0;
  }
  if (seed === 0) seed = Math.floor(Math.random() * ceiling) + 1;
  if (seed === previousSeed) seed = seed === ceiling ? 1 : seed + 1;
  return `np1-${size}-${seed}`;
}
