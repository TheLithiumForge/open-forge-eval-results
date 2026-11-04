import { formatTime } from '../state.ts';
import './Status.css';

type Props = { moves: number; pairs: number; total: number; elapsedMs: number; best: number | undefined };

export function Status({ moves, pairs, total, elapsedMs, best }: Props) {
  return <div className="status" aria-label="Game statistics">
    <span>Moves: <strong>{moves}</strong></span>
    <span>Pairs: <strong>{pairs}/{total}</strong></span>
    <span>Time: <strong>{formatTime(elapsedMs)}</strong></span>
    <span>Best: <strong>{best ?? 'none'}</strong></span>
  </div>;
}
