import { formatTime, isWon } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

export type StatusProps = { game: GameState; best: number | undefined; celebrate: boolean; paused: boolean };

export function Status({ game, best, celebrate, paused }: StatusProps) {
  const pairs = game.matched.length / 2;
  return <>
    <div className="status-strip" aria-label="Game statistics">
      <span>Moves: <strong>{game.moves}</strong></span>
      <span>Pairs: <strong>{pairs}/{game.board.deck.length / 2}</strong></span>
      <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span>
      <span>Best: <strong>{best ?? 'none'}</strong></span>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <span className="win-mark" aria-hidden="true">✓</span>
      <div><h2>All pairs found!</h2><p>{game.moves} moves · {formatTime(game.elapsedMs)}</p></div>
    </div>}
    {paused && <p className="pause-note">Snapshot paused. Select Resume when you’re ready.</p>}
  </>;
}
