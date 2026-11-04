import type { BoardSize } from "../board.ts";
import { readBestScores, saveBestScore, type BestScores, type SessionStorage } from "./storage.ts";

export type ScoreUpdate = Readonly<{ scores: BestScores; bestMoves: number }>;

export function initialBestScores(storage: SessionStorage | null): BestScores {
  return readBestScores(storage);
}

export function bestForSize(scores: BestScores, size: BoardSize): number | null {
  return scores[size] ?? null;
}

export function recordCompletedGame(
  scores: BestScores,
  storage: SessionStorage | null,
  size: BoardSize,
  moves: number,
): ScoreUpdate {
  const known = scores[size];
  const stored = saveBestScore(storage, size, moves);
  const bestMoves = known === undefined ? Math.min(stored ?? moves, moves) : Math.min(known, moves);
  const nextScores = bestMoves === known ? scores : { ...scores, [size]: bestMoves };
  return { scores: nextScores, bestMoves };
}
