import { formatTime } from './advanceGame.ts';
import './Status.css';

export type StatusProps = Readonly<{
  moves: number; pairs: number; total: number; elapsedMs: number; best: number | undefined;
}>;
export function Status({ moves, pairs, total, elapsedMs, best }: StatusProps) {
  return <div className="game-status" aria-label="Game status">
    <span><span className="status-label">Moves:</span> {moves}</span>
    <span><span className="status-label">Pairs:</span> {pairs}/{total}</span>
    <span><span className="status-label">Time:</span> {formatTime(elapsedMs)}</span>
    <span><span className="status-label">Best:</span> {best ?? 'none'}</span>
  </div>;
}
