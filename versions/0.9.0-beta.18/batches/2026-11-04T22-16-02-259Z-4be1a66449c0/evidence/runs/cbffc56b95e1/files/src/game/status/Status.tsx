import { boardTotalPairs, isWon, matchedPairs, type GameState } from "../game";
import { formatTime } from "../time";

interface StatusProps {
  readonly game: GameState;
  readonly best: number | undefined;
  readonly celebrating: boolean;
  readonly onCelebrationEnd: () => void;
}

export function Status({ game, best, celebrating, onCelebrationEnd }: StatusProps) {
  const won = isWon(game);
  const time = formatTime(game.elapsedMs);
  return (
    <>
      <dl className="game-status" aria-label="Game status">
        <div><dt>Moves:{" "}</dt><dd>{game.moves}</dd></div>
        <div><dt>Pairs:{" "}</dt><dd>{matchedPairs(game)}/{boardTotalPairs(game)}</dd></div>
        <div><dt>Time:{" "}</dt><dd>{time}</dd></div>
        <div><dt>Best:{" "}</dt><dd>{best ?? "none"}</dd></div>
      </dl>
      {won && (
        <section className={`win-banner${celebrating ? " celebrate" : ""}`} onAnimationEnd={onCelebrationEnd} aria-label="Game complete">
          <h2>All pairs found!</h2>
          <p>Finished in {game.moves} moves and {time}.</p>
        </section>
      )}
    </>
  );
}
