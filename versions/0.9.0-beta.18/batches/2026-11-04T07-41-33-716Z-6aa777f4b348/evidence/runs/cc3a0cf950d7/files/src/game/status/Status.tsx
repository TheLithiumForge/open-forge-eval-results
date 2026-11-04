import { formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import './Status.css';

interface StatusProps { game: GameState; best: number | undefined; celebrate: boolean }

export function Status({ game, best, celebrate }: StatusProps) {
  return <>
    <div className="status" aria-label="Game status">
      <span>Moves: <strong>{game.moves}</strong></span>
      <span>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></span>
      <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span>
      <span>Best: <strong>{best ?? 'none'}</strong></span>
    </div>
    {isWon(game) && <div className={`win${celebrate ? ' pulse' : ''}`}>
      <span aria-hidden="true">✧</span>
      <div><strong>All pairs found.</strong><p>{game.moves} moves · {formatTime(game.elapsedMs)}</p></div>
    </div>}
  </>;
}
