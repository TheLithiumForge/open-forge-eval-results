import { formatBoardCode, MAX_SEED, type BoardSize } from "../boardCode.ts";
import { createGame, type GameState } from "../state.ts";

export function freshGame(size: BoardSize, previousCode?: string): GameState {
  let seed = randomSeed();
  const previousSeed = previousCode?.split("-")[2];
  if (String(seed) === previousSeed) seed = seed === MAX_SEED ? 1 : seed + 1;
  const code = formatBoardCode(size, seed);
  if (code === null) throw new Error("Unable to create a board code.");
  const game = createGame(code);
  if (game === null) throw new Error("Unable to create a new game.");
  return game;
}

function randomSeed(): number {
  try {
    if (typeof window !== "undefined") {
      const value = window.crypto.getRandomValues(new Uint32Array(1))[0];
      if (value !== undefined) return (value % MAX_SEED) + 1;
    }
  } catch {
    // A browser without crypto can still start a playable fresh deal.
  }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}
