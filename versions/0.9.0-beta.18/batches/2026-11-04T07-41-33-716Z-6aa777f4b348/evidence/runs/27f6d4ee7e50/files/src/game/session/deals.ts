import type { BoardSize } from "../boardCode.ts";
import { createGame } from "../state.ts";
import type { GameState } from "../state.ts";

const MAX_SEED = 2_147_483_646;

export function gameForCode(code: string): GameState {
  const game = createGame(code);
  if (game === null) throw new Error("A session created an invalid board code.");
  return game;
}

function freshSeed(excluding?: number): number {
  let seed: number;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    seed = (values[0] ?? 0) % MAX_SEED + 1;
  } catch {
    seed = Math.floor(Math.random() * MAX_SEED) + 1;
  }
  if (seed === excluding) return seed === MAX_SEED ? 1 : seed + 1;
  return seed;
}

export function freshGame(size: BoardSize, excluding?: number): GameState {
  return gameForCode(`np1-${size}-${freshSeed(excluding)}`);
}
