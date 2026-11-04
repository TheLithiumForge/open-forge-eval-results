import { formatTime } from './rules.ts';
import { isWon } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

interface StatusProps { game: GameState; best: number | undefined; celebrate: boolean; paused: boolean }

export function Status({ game, best, celebrate, paused }: StatusProps) {
  return <>
    <div className="game-status" aria-label="Game statistics">
      <p><span>Moves: </span><strong>{game.moves}</strong></p>
      <p><span>Pairs: </span><strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></p>
      <p><span>Time: </span><strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best: </span><strong>{best ?? 'none'}</strong></p>
    </div>
    {paused && <p className="pause-banner">Progress loaded and paused. Resume when you’re ready.</p>}
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <span className="win-mark" aria-hidden="true">✓</span>
      <div><h2>All pairs found!</h2><p>{game.moves} moves · {formatTime(game.elapsedMs)}</p></div>
    </div>}
  </>;
}
