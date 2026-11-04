import { formatTime } from '../format-time.ts';
import type { GameState } from '../state.ts';
import './GameStatus.css';

export interface GameStatusProps { readonly game: GameState; readonly best: number | null }

export function GameStatus({ game, best }: GameStatusProps) {
  return (
    <div className="game-status" aria-label="Game status">
      <p>Moves: <strong>{game.moves}</strong></p>
      <p>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></p>
      <p>Time: <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p>Best: <strong>{best === null ? 'none' : best}</strong></p>
    </div>
  );
}
