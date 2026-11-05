import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament } from './model.ts';

function summary(tournament: Tournament): string {
  return tournament.rounds
    .flatMap((round) =>
      round.matches.map((match) => {
        const first = match.players[0];
        const second = match.players[1];
        const firstResult = match.results[0];
        const secondResult = match.results[1];
        if (!first || !second || !firstResult || !secondResult || !match.winner) return '';
        return `${match.id}: ${first.name} ${firstResult.moves} moves, ${formatElapsed(firstResult.elapsedMs)}; ${second.name} ${secondResult.moves} moves, ${formatElapsed(secondResult.elapsedMs)}; winner ${match.winner.name}`;
      }),
    )
    .filter(Boolean)
    .join(' · ');
}

export function PastTournaments({
  tournaments,
  storageAvailable,
}: {
  tournaments: readonly Tournament[];
  storageAvailable: boolean;
}) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-title">
      <h3 id="past-tournaments-title">Past tournaments</h3>
      {!storageAvailable && (
        <p className="storage-warning">Progress won't be saved on this device.</p>
      )}
      {tournaments.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <div className="tournament-table-scroll">
          <table>
            <caption>Past tournaments</caption>
            <thead>
              <tr>
                <th scope="col">Players</th>
                <th scope="col">Champion</th>
                <th scope="col">Match results</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => (
                <tr key={tournament.id}>
                  <td>{tournament.players.map((player) => player.name).join(', ')}</td>
                  <td>{tournament.champion?.name ?? '—'}</td>
                  <td>{summary(tournament)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
