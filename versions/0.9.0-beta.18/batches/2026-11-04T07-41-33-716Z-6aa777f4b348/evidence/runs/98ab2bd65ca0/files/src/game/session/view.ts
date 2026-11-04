import { isWon, pairCount, type GameState } from "../state.ts";
import type { BoardSize } from "../board/sizes.ts";
import type { GameSessionView, SessionAnnouncement } from "./types.ts";

export function createSessionView(
  game: GameState,
  size: BoardSize,
  bestMoves: number | null,
  dealRevision: number,
  paused: boolean,
  visible: boolean,
  celebrationId: number,
  announcement: SessionAnnouncement | null,
  status: string,
): GameSessionView {
  const won = isWon(game);
  return Object.freeze({
    game,
    size,
    bestMoves,
    dealRevision,
    paused,
    visible,
    running: visible && !paused && game.started && !won,
    pairCount: pairCount(game),
    totalPairs: game.board.deck.length / 2,
    won,
    celebrationId,
    announcement,
    status,
  });
}
