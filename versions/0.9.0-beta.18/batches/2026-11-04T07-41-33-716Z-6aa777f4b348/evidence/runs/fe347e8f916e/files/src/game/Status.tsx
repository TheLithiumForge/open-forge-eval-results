import { formatTime } from './format.ts';
import { isWon } from './model.ts';
import type { GameState } from './model.ts';
import './Status.css';

export interface StatusProps {
  readonly game: GameState;
  readonly best: number | undefined;
  readonly celebrate: boolean;
}
export function Status({ game, best, celebrate }: StatusProps) {
  return <>
    <div className="stats" aria-label="Game statistics">
      <p><span>Moves: </span><strong>{game.moves}</strong></p>
      <p><span>Pairs: </span><strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></p>
      <p><span>Time: </span><strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best: </span><strong>{best ?? 'none'}</strong></p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found!</strong>
      <p>{game.moves} moves · {formatTime(game.elapsedMs)}. A perfect moment to play again.</p>
    </div>}
  </>;
}
