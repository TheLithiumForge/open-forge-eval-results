import { formatTime } from '../advanceGame.ts';
import { isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';
import './GameStatus.css';

type GameStatusProps = Readonly<{ game: GameState; best: number | undefined; celebrate: boolean }>;

export function GameStatus({ game, best, celebrate }: GameStatusProps) {
  return <>
    <div className="game-status" aria-label="Game status">
      <p><span>Moves:</span> <strong>{game.moves}</strong></p>
      <p><span>Pairs:</span> <strong>{pairCount(game)}/{game.deck.length / 2}</strong></p>
      <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best:</span> <strong>{best ?? 'none'}</strong></p>
    </div>
    {isWon(game) && <div className={`win-banner${celebrate ? ' celebrate' : ''}`}>
      <h2>All pairs found!</h2>
      <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </div>}
  </>;
}
