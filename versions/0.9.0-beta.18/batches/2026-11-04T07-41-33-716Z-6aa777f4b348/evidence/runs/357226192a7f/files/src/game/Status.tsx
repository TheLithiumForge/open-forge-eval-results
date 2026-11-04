import { formatTime, isWon, pairCount } from './state.ts';
import type { GameState } from './state.ts';
import './Status.css';

export type StatusProps = Readonly<{ game: GameState; best: number | undefined; celebrate: boolean }>;

export function Status({ game, best, celebrate }: StatusProps) {
  return <>
    <div className="game-status" aria-label="Game status">
      <p>Moves: {game.moves}</p>
      <p>Pairs: {pairCount(game)}/{game.deck.length / 2}</p>
      <p>Time: {formatTime(game.elapsedMs)}</p>
      <p>Best: {best ?? 'none'}</p>
    </div>
    {isWon(game) && <div className={'win-banner' + (celebrate ? ' celebrate' : '')}>
      <strong>All pairs found!</strong>
      <p>{game.moves} moves · {formatTime(game.elapsedMs)}</p>
    </div>}
  </>;
}
