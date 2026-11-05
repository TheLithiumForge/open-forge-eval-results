import type { Tournament } from './types.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import { encodeTournament } from './format.ts';

interface TournamentPastProps {
  tournaments: readonly Tournament[];
  storageBlocked: boolean;
}

export function TournamentPast({ tournaments, storageBlocked }: TournamentPastProps) {
  return (
    <section className="tournament-past" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {tournaments.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ol>
          {tournaments.map((tournament) => (
            <li key={encodeTournament(tournament)}>
              <details className="tournament-past-event">
                <summary>
                  {tournament.playerCount} players · Champion: {tournament.champion?.name}
                </summary>
                <TournamentBracket tournament={tournament} />
              </details>
            </li>
          ))}
        </ol>
      )}
      {storageBlocked && (
        <p className="tournament-storage-warning">Progress won't be saved on this device.</p>
      )}
    </section>
  );
}
