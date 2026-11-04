import { formatTime } from '../formatTime.ts';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import './Status.css';

interface StatusProps {
  readonly game: GameState;
  readonly best: number | null;
  readonly celebrate: boolean;
}

export function Status({ game, best, celebrate }: StatusProps) {
  return <section className="game-status" aria-label="Game status">
    <div className="statistics">
      <p><span>Moves:</span> <strong>{game.moves}</strong></p>
      <p><span>Pairs:</span> <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></p>
      <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best:</span> <strong>{best === null ? 'none' : best}</strong></p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <h2>All pairs found!</h2>
      <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </div>}
  </section>;
}
