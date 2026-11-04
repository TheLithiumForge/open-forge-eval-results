import { isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { formatTime } from './time.ts';
import './Status.css';

export interface StatusProps {
  readonly game: GameState;
  readonly best: number | undefined;
  readonly celebrate: boolean;
}
export function Status({ game, best, celebrate }: StatusProps) {
  return <>
    <div className="game-status" aria-label="Game status">
      <p>Moves: {game.moves}</p>
      <p>Pairs: {pairCount(game)}/{game.board.deck.length / 2}</p>
      <p>Time: {formatTime(game.elapsedMs)}</p>
      <p>Best: {best ?? 'none'}</p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <h2>All pairs found!</h2>
      <p>{game.moves} moves · {formatTime(game.elapsedMs)}</p>
    </div>}
  </>;
}
