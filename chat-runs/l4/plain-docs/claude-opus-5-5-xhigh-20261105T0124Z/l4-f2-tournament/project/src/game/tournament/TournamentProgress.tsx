import { champion, matchLabel, matchRound, matchSeeds, playerName } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';

interface TournamentProgressProps {
  tournament: Tournament;
  turn: number;
  back(): void;
}

// The round and match being played, or the champion once the final has both results.
export function TournamentProgress({ tournament, turn, back }: TournamentProgressProps) {
  const winner = champion(tournament);
  if (winner !== null)
    return (
      <>
        <p className="champion">Champion: {winner}</p>
        <div className="tournament-actions">
          <button type="button" className="control" onClick={back}>
            {TournamentControl.back}
          </button>
        </div>
      </>
    );
  const count = tournament.players.length;
  const match = Math.floor(turn / 2);
  const names = matchSeeds(tournament, match).map((seed) =>
    seed === null ? '' : playerName(tournament, seed),
  );
  return (
    <div className="tournament-progress">
      <p>Round: {matchRound(count, match)}</p>
      <p>
        {matchLabel(count, match)}: {names.join(' against ')}
      </p>
    </div>
  );
}
