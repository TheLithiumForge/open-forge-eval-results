import { MAX_BOARD_SEED, type BoardSize } from "../board.ts";
import { createGame, type GameState } from "../state.ts";

export function freshGame(size: BoardSize, currentCode?: string): GameState {
  const entropy = new Uint32Array(1);
  try {
    crypto.getRandomValues(entropy);
  } catch {
    entropy[0] = Math.floor(Math.random() * (MAX_BOARD_SEED + 1));
  }
  let seed = (Number(entropy[0]) % MAX_BOARD_SEED) + 1;
  let code = `np1-${size}-${seed}`;
  if (code === currentCode) {
    seed = seed === MAX_BOARD_SEED ? 1 : seed + 1;
    code = `np1-${size}-${seed}`;
  }
  const game = createGame(code);
  if (game) return game;
  throw new Error("Generated board code was invalid");
}
