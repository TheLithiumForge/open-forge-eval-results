import { tournamentPlayer } from './tournament.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import type { Tournament } from './tournament.ts';

export function PastTournaments({
  tournaments,
  storageNotice,
}: {
  readonly tournaments: readonly Tournament[];
  readonly storageNotice: string;
}) {
  return (
    <section className="past-tournaments">
      <h2>Past tournaments</h2>
      {storageNotice && <p role="status">{storageNotice}</p>}
      {tournaments.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ul>
          {tournaments.map((tournament) => {
            const champion = tournamentPlayer(tournament, tournament.champion)?.name ?? 'Unknown';
            return (
              <li key={tournament.startedAt}>
                <details>
                  <summary>Champion: {champion}</summary>
                  <TournamentBracket tournament={tournament} />
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
