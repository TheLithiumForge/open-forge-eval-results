import { championOf } from './rules.ts';
import { RECORDS_BLOCKED } from './records.ts';
import { TournamentText } from './tournament-labels.ts';
import type { Records } from './use-tournament-records.ts';
import './tournament.css';

interface PastTournamentsProps {
  records: Records;
}

export function PastTournaments({ records }: PastTournamentsProps) {
  const newestFirst = [...records.items].reverse();
  return (
    <section className="past">
      <div className="table-scroll" role="region" aria-labelledby="past-title" tabIndex={0}>
        <table className="results">
          <caption id="past-title">{TournamentText.past}</caption>
          <thead>
            <tr>
              <th scope="col">Champion</th>
              <th scope="col">Players</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.length === 0 && (
              <tr>
                <td colSpan={2} className="name">
                  {TournamentText.noPast}
                </td>
              </tr>
            )}
            {newestFirst.map((tournament, index) => {
              const champion = championOf(tournament);
              return (
                <tr key={index}>
                  <td className="name">
                    {champion === undefined ? '' : tournament.players[champion]}
                  </td>
                  <td className="name">{tournament.players.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {records.blocked && <p className="storage-notice">{RECORDS_BLOCKED}</p>}
    </section>
  );
}
