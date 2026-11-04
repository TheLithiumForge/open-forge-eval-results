import { isWon, pairCount } from './game/state.ts';
import type { GameState } from './game/state.ts';
import { formatTime } from './game/transitions.ts';
import './GameStatus.css';

interface GameStatusProps { readonly game: GameState; readonly best: number | undefined; readonly celebrate: boolean }

export function GameStatus({ game, best, celebrate }: GameStatusProps) {
  return <>
    <div className="game-status" aria-label="Game status">
      <p><span>Moves:</span> <strong>{game.moves}</strong></p>
      <p><span>Pairs:</span> <strong>{pairCount(game)}/{game.deck.length / 2}</strong></p>
      <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best:</span> <strong>{best ?? 'none'}</strong></p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' win-banner--pulse' : ''}`}>
      <strong>All pairs found!</strong>
      <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </div>}
  </>;
}
