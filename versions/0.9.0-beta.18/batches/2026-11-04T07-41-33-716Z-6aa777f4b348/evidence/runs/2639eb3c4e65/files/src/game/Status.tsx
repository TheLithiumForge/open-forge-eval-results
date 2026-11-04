import type { GameState } from './model.ts';
import { isWon } from './model.ts';
import './Status.css';

type StatusProps = { game: GameState; best: number | undefined; time: string; celebrate: boolean };

export function Status({ game, best, time, celebrate }: StatusProps) {
  return <>
    <div className="status" aria-label="Game status">
      <p>Moves: {game.moves}</p><p>Pairs: {game.matched.length / 2}/{game.board.deck.length / 2}</p>
      <p>Time: {time}</p><p>Best: {best ?? 'none'}</p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found!</strong><p>Completed in {game.moves} moves and {time}.</p>
    </div>}
  </>;
}
