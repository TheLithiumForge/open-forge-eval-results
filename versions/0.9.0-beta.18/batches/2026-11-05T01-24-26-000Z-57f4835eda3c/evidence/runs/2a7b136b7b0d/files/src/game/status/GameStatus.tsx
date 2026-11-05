import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { StatusLabel } from './status-labels.ts';
import type { GameState } from '../game.ts';
import './status.css';

interface GameStatusProps {
  game: GameState;
  // Undefined shows that this size has no record. Null leaves Best out for a game that keeps none.
  best: number | undefined | null;
  celebration: boolean;
}

export function GameStatus({ game, best, celebration }: GameStatusProps) {
  return (
    <>
      <dl className="stats">
        <div>
          <dt>{StatusLabel.moves}</dt> <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>{StatusLabel.pairs}</dt>{' '}
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>{StatusLabel.time}</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
        {best !== null && (
          <div>
            <dt>{StatusLabel.best}</dt> <dd>{best ?? 'none'}</dd>
          </div>
        )}
      </dl>
      {isWon(game) && (
        <p className={`victory${celebration ? ' celebrate' : ''}`}>
          Every pair found in {game.moves} moves and {formatElapsed(game.elapsedMs)}. Well played.
        </p>
      )}
    </>
  );
}
