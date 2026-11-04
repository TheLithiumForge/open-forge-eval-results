import { formatTime, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

export interface StatusProps {
  game: GameState;
  best: number | null;
}

export function Status({ game, best }: StatusProps) {
  return <div className="game-status" role="group" aria-label="Game statistics">
    <p><span>Moves:</span> <strong>{game.moves}</strong></p>
    <p><span>Pairs:</span> <strong>{pairCount(game)}/{game.board.deck.length / 2}</strong></p>
    <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
    <p><span>Best:</span> <strong>{best ?? 'none'}</strong></p>
  </div>;
}
