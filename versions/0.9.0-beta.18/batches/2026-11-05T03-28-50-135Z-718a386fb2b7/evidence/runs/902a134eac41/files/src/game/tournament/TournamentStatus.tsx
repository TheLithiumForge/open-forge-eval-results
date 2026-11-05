import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { StatusLabel } from '../status/status-labels.ts';
import type { GameState } from '../game.ts';
import '../status/status.css';
import './tournament.css';

interface TournamentStatusProps {
  game: GameState;
}

export function TournamentStatus({ game }: TournamentStatusProps) {
  return (
    <>
      <dl className="stats tournament-stats">
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
      </dl>
      {isWon(game) && (
        <p className="victory">
          Game complete in {game.moves} moves and {formatElapsed(game.elapsedMs)}.
        </p>
      )}
    </>
  );
}
