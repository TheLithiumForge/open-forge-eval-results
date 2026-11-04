import { formatTime } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

export function Status({ game, best }: { game: GameState; best: number | undefined }) {
  return <div className="status" aria-label="Game statistics">
    <span>Moves: <strong>{game.moves}</strong></span>
    <span>Pairs: <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></span>
    <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span>
    <span>Best: <strong>{best ?? 'none'}</strong></span>
  </div>;
}
