import type { GameState } from '../state.ts';
import { isWon } from '../state.ts';
import { formatTime } from './formatTime.ts';
import './GameStatus.css';

export interface GameStatusProps {
  readonly game: GameState;
  readonly best: number | null;
  readonly paused: boolean;
  readonly celebrate: boolean;
}

export function GameStatus({ game, best, paused, celebrate }: GameStatusProps) {
  return <section className="game-status" aria-label="Game status">
    <div className="stats">
      <p><span className="stat-label">Moves:</span> {game.moves}</p>
      <p><span className="stat-label">Pairs:</span> {game.matched.length / 2}/{game.deck.length / 2}</p>
      <p><span className="stat-label">Time:</span> {formatTime(game.elapsedMs)}</p>
      <p><span className="stat-label">Best:</span> {best ?? 'none'}</p>
    </div>
    {paused && <p className="pause-note">Paused · Select Resume in Reproduce a game to continue.</p>}
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <h2>All pairs found!</h2>
      <p>{game.moves} moves · {formatTime(game.elapsedMs)}</p>
    </div>}
  </section>;
}
