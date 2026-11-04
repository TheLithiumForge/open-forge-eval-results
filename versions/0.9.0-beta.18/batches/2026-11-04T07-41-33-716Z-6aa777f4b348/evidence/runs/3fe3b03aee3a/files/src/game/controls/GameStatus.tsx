import { formatElapsed } from "../session/deal.ts";
import type { GameState } from "../types.ts";
import { isWon } from "../state.ts";
import "./game-status.css";

export type GameStatusProps = Readonly<{
  game: GameState;
  bestScore: number | null;
  celebrating: boolean;
}>;

export function GameStatus({ game, bestScore, celebrating }: GameStatusProps) {
  const complete = isWon(game);
  const pairs = game.matched.length / 2;

  return (
    <>
      <div className="score-strip">
        <p>Moves: <strong>{game.moves}</strong></p>
        <p>Pairs: <strong>{pairs}/{game.board.deck.length / 2}</strong></p>
        <p>Time: <strong>{formatElapsed(game.elapsedMs)}</strong></p>
        <p>Best: <strong>{bestScore ?? "none"}</strong></p>
      </div>
      {complete && (
        <section className={`win-banner${celebrating ? " is-celebrating" : ""}`} aria-label="Game complete">
          <p className="win-kicker">ALL PAIRS FOUND</p>
          <p className="win-summary">Completed in {game.moves} moves</p>
          <p className="win-time">Time: {formatElapsed(game.elapsedMs)}</p>
        </section>
      )}
    </>
  );
}
