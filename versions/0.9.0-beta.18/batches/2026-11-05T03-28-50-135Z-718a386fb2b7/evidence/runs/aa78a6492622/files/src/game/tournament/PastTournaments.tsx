import { Bracket } from './Bracket.tsx';
import { champion } from './rules.ts';
import type { Tournament } from './rules.ts';

interface PastTournamentsProps {
  tournaments: readonly Tournament[];
  storageAvailable: boolean;
}

export function PastTournaments({ tournaments, storageAvailable }: PastTournamentsProps) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {!storageAvailable && <p>Progress won't be saved on this device.</p>}
      {tournaments.length === 0 ? (
        <p>No completed tournaments.</p>
      ) : (
        <div className="past-tournament-list">
          {tournaments.map((tournament) => {
            const winner = champion(tournament);
            return (
              <details key={`${tournament.createdAt}-${tournament.matches[0]?.boardCode}`}>
                <summary>
                  Champion: {winner?.name ?? 'Unknown'} · {tournament.finishedAt}
                </summary>
                <Bracket tournament={tournament} label="Past tournament bracket" />
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
