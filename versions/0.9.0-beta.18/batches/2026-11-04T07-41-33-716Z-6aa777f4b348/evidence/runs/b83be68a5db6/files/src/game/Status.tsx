import { formatTime } from './format-time.ts';
import type { GameState } from './state.ts';
import './Status.css';

export function Status({ state, best }: { state: GameState; best: number | undefined }) {
  return <div className="status" aria-label="Game progress">
    <span>Moves: <strong>{state.moves}</strong></span>
    <span>Pairs: <strong>{state.matched.length / 2}/{state.board.deck.length / 2}</strong></span>
    <span>Time: <strong>{formatTime(state.elapsedMs)}</strong></span>
    <span>Best: <strong>{best ?? 'none'}</strong></span>
  </div>;
}
