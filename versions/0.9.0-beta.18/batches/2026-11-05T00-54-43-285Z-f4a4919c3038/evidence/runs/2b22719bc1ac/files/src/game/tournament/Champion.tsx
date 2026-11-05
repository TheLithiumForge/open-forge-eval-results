import { formatElapsed } from '../elapsed-time.ts';
import type { TournamentState } from './rules.ts';

export function Champion({
  tournament,
  celebration,
}: {
  tournament: TournamentState;
  celebration: boolean;
}) {
  const match = tournament.matches.at(-1);
  const winner = match?.winner;
  const result = match?.results.at(-1);
  return (
    <div>
      <p className="champion">
        Champion: {winner === undefined || winner === null ? '' : tournament.players[winner]}
      </p>
      {result && (
        <p className={`victory${celebration ? ' celebrate' : ''}`}>
          Every pair found in {result.moves} moves and {formatElapsed(result.elapsedMs)}.
        </p>
      )}
    </div>
  );
}
