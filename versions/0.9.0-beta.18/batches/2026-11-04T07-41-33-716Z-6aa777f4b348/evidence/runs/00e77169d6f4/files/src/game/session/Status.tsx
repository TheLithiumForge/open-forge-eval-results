import { formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';

type Props = { game: GameState; best: number | undefined; celebrate: boolean };
export function Status({ game, best, celebrate }: Props) {
  return <>
    <div className="status-bar" aria-label="Game statistics">
      <span>Moves: {game.moves}</span><span>Pairs: {game.matched.length / 2}/{game.board.deck.length / 2}</span>
      <span>Time: {formatTime(game.elapsedMs)}</span><span>Best: {best ?? 'none'}</span>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found.</strong><span>{game.moves} moves · {formatTime(game.elapsedMs)}</span>
    </div>}
  </>;
}
