import { BOARD_SIZES } from "../board.ts";
import { freshGame } from "./deal.ts";
import { bestForSize } from "./best.ts";
import { isWon } from "../state.ts";
import { readGridSize, type BestScores, type SessionStorage } from "./storage.ts";
import type { GameSessionView } from "./types.ts";

export function initialView(storage: SessionStorage | null, scores: BestScores): GameSessionView {
  const size = readGridSize(storage) ?? BOARD_SIZES[0];
  const game = freshGame(size);
  return { game, paused: false, dealId: 0, bestMoves: bestForSize(scores, size),
    celebrating: false, announcement: null };
}

export function isActive(view: GameSessionView): boolean {
  return !view.paused && view.game.started && !isWon(view.game);
}
