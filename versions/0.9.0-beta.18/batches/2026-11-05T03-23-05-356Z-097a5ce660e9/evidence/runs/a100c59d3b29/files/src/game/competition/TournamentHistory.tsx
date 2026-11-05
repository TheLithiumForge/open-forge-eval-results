import { PastBracket } from './TournamentBracket.tsx';
import type { PastTournament } from './types.ts';

interface TournamentHistoryProps {
  readonly tournaments: readonly PastTournament[];
  readonly storageAvailable: boolean;
}

export function TournamentHistory({ tournaments, storageAvailable }: TournamentHistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {!storageAvailable && <p>Progress won't be saved on this device.</p>}
      {tournaments.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ol className="tournament-history-list">
          {tournaments.map((tournament, index) => {
            const champion = tournament.players.find(
              (player) => player.seed === tournament.championSeed,
            );
            return (
              <li key={`${tournament.matches[0]?.boardCode ?? 'tournament'}-${index}`}>
                <details>
                  <summary>
                    Champion: {champion?.name ?? 'Unknown'} · {tournament.playerCount} players
                  </summary>
                  <PastBracket tournament={tournament} />
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
