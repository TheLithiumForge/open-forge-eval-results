import type { Tournament } from './tournament.ts';
import { TournamentBracket } from './TournamentBracket.tsx';

interface PastTournamentsProps {
  tournaments: readonly Tournament[];
}

export function PastTournaments({ tournaments }: PastTournamentsProps) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-title">
      <h2 id="past-tournaments-title">Past tournaments</h2>
      {tournaments.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ol>
          {tournaments.map((tournament) => {
            const champion = tournament.players[tournament.championId ?? -1]?.name ?? 'Unknown';
            const completedAt = tournament.completedAt ?? tournament.createdAt;
            return (
              <li key={tournament.id}>
                <details>
                  <summary>
                    <strong>{champion}</strong> won the {tournament.players.length}-player
                    tournament
                    <time dateTime={new Date(completedAt).toISOString()}>
                      {` · ${new Date(completedAt).toLocaleString()}`}
                    </time>
                  </summary>
                  <TournamentBracket tournament={tournament} />
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
