import { formatElapsed } from '../elapsed-time.ts';
import type { GameState } from '../game.ts';
import './tournament.css';

export function TournamentStatus({ game }: { game: GameState }) {
  return (
    <>
      <dl className="stats tournament-stats">
        <div>
          <dt>Moves:</dt> <dd>{game.moves}</dd>
        </div>
        <div>
          <dt>Pairs:</dt>{' '}
          <dd>
            {game.matched.length / 2}/{game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>Time:</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
        </div>
      </dl>
      {game.matched.length === game.deck.length && (
        <p className="victory">
          Every pair found in {game.moves} moves and {formatElapsed(game.elapsedMs)}.
        </p>
      )}
    </>
  );
}
