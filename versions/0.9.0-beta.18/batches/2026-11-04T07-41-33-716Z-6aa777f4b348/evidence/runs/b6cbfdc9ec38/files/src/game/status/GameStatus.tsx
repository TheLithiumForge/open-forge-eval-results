import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { formatTime } from '../session/formatTime.ts';
import './GameStatus.css';

export interface GameStatusProps {
  readonly game: GameState;
  readonly best: number | null;
  readonly celebrate: boolean;
  readonly paused: boolean;
}

export function GameStatus({ game, best, celebrate, paused }: GameStatusProps) {
  const time = formatTime(game.elapsedMs);
  return (
    <section aria-label="Game status" className="game-status">
      <div className="scoreboard">
        <p>Moves: <strong>{game.moves}</strong></p>
        <p>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></p>
        <p>Time: <strong>{time}</strong></p>
        <p>Best: <strong>{best ?? 'none'}</strong></p>
      </div>
      {paused && <p className="paused-note">Game paused. Select Resume in Reproduce a game to continue.</p>}
      {isWon(game) && (
        <div className={`win-banner${celebrate ? ' win-banner--celebrate' : ''}`}>
          <strong>All pairs found!</strong>
          <span>{game.moves} moves · {time}</span>
        </div>
      )}
    </section>
  );
}
