import { formatTime, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

type StatusProps = Readonly<{ game: GameState; best: number | null; celebrate: boolean }>;

export function Status({ game, best, celebrate }: StatusProps) {
  return (
    <section className="game-status" aria-label="Game status">
      <div className="status-values">
        <p><span>Moves:</span> <strong>{game.moves}</strong></p>
        <p><span>Pairs:</span> <strong>{pairCount(game)}/{game.board.deck.length / 2}</strong></p>
        <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
        <p><span>Best:</span> <strong>{best ?? 'none'}</strong></p>
      </div>
      {isWon(game) && (
        <section className={`win-banner${celebrate ? ' win-banner--celebrate' : ''}`} aria-labelledby="win-title">
          <h2 id="win-title">All pairs found!</h2>
          <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
        </section>
      )}
    </section>
  );
}
