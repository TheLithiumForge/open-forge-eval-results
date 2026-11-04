import { isWon } from "../transitions.ts";
import type { GameState } from "../types.ts";
import { formatElapsedTime } from "../session/clock.ts";
import "./status.css";

export type StatusPanelProps = Readonly<{
  game: GameState;
  bestMoves: number | undefined;
  paused: boolean;
  celebration: boolean;
}>;

export function StatusPanel({ game, bestMoves, paused, celebration }: StatusPanelProps) {
  const pairs = game.matched.length / 2;
  const won = isWon(game);
  return (
    <>
      <section className="status-panel" aria-label="Game status">
        <p>Pairs: <strong>{pairs}/{game.board.deck.length / 2}</strong></p>
        <p>Moves: <strong>{game.moves}</strong></p>
        <p>Time: <strong>{formatElapsedTime(game.elapsedMs)}</strong></p>
        <p>Best: <strong>{bestMoves === undefined ? "none" : bestMoves}</strong></p>
        {paused ? <p className="pause-note">Snapshot paused</p> : null}
      </section>
      {won ? (
        <section className={`win-banner${celebration ? " win-celebrate" : ""}`} aria-label="Game complete">
          <h2>All pairs found</h2>
          <p>Completed in {game.moves} moves and {formatElapsedTime(game.elapsedMs)}.</p>
        </section>
      ) : null}
    </>
  );
}
