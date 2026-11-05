import { playerName } from './model.ts';
import type { TournamentRecord } from './model.ts';
import './tournament.css';

interface HistoryProps {
  records: readonly TournamentRecord[];
  storageAvailable: boolean;
}

export function TournamentHistory({ records, storageAvailable }: HistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {!storageAvailable && <p>Progress won&apos;t be saved on this device.</p>}
      {records.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <table>
          <caption>Finished tournaments</caption>
          <thead>
            <tr>
              <th scope="col">Players</th>
              <th scope="col">Champion</th>
              <th scope="col">Matches</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const champion = playerName(record, record.championSeed);
              const names = record.players.map((player) => player.name).join(', ');
              return (
                <tr key={`${record.championSeed}-${index}`}>
                  <td>{names}</td>
                  <td>{champion}</td>
                  <td>{record.matches.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
