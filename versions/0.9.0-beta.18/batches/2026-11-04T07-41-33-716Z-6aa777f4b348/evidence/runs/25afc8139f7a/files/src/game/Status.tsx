import { isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import { formatTime } from './time.ts';
import './Status.css';

type StatusProps = Readonly<{ game: GameState; best: number | undefined; celebrate: boolean }>;

export function Status({ game, best, celebrate }: StatusProps) {
  return <>
    <div className="game-status" aria-label="Game status">
      <span>Moves: <strong>{game.moves}</strong></span>
      <span>Pairs: <strong>{pairCount(game)}/{game.board.deck.length / 2}</strong></span>
      <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span>
      <span>Best: <strong>{best ?? 'none'}</strong></span>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' win-pulse' : ''}`}>
      <h2>All pairs found!</h2>
      <p>Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </div>}
  </>;
}
