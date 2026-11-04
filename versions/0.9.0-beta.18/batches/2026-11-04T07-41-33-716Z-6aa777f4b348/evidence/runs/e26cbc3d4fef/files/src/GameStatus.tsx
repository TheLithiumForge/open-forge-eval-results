import { formatTime } from './game/format.ts';
import type { GameState } from './game/state.ts';
import './GameStatus.css';

export interface GameStatusProps {
  readonly game: GameState;
  readonly best: number | null;
}

export function GameStatus({ game, best }: GameStatusProps) {
  return (
    <div className="game-status" role="group" aria-label="Game status">
      <p>Moves: {game.moves}</p>
      <p>Pairs: {game.matched.length / 2}/{game.deck.length / 2}</p>
      <p>Time: {formatTime(game.elapsedMs)}</p>
      <p>Best: {best ?? 'none'}</p>
    </div>
  );
}
