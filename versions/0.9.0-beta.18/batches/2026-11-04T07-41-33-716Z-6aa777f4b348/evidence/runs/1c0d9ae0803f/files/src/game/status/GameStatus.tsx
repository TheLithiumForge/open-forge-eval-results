import type { GameState } from "../state.ts";
import { matchedPairs } from "../state.ts";
import { formatTime } from "../timing.ts";
import "./status.css";

type GameStatusProps = Readonly<{
  game: GameState;
  bestMoves: number | null;
}>;

export function GameStatus({ game, bestMoves }: GameStatusProps): React.JSX.Element {
  const pairs = matchedPairs(game);
  return (
    <section className="neon-game-status" aria-label="Game status">
      <p>Moves: {game.moves}</p>
      <p>Pairs: {pairs}/{game.board.deck.length / 2}</p>
      <p>Time: {formatTime(game.elapsedMs)}</p>
      <p>Best: {bestMoves === null ? "none" : bestMoves}</p>
    </section>
  );
}
