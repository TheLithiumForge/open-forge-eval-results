import { formatTime } from './formatTime.ts';
import { isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

interface StatusProps {
  readonly game: GameState;
  readonly best: number | null;
  readonly celebrate: boolean;
  readonly paused: boolean;
}

export function Status({ game, best, celebrate, paused }: StatusProps) {
  return <div className="status-area">
    <div className="game-stats" aria-label="Game statistics">
      <p><span>Moves: </span><strong>{game.moves}</strong></p>
      <p><span>Pairs: </span><strong>{pairCount(game)}/{game.deck.length / 2}</strong></p>
      <p><span>Time: </span><strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best: </span><strong>{best ?? 'none'}</strong></p>
    </div>
    {isWon(game) && <section className={`win-banner${celebrate ? ' win-celebrate' : ''}`} aria-label="Game complete">
      <h2>All pairs found.</h2><p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </section>}
    {paused && <p className="pause-note">Your snapshot is paused. Select Resume when you’re ready.</p>}
  </div>;
}
