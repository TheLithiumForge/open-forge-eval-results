import { championOf, nameOf, runnerUpOf } from './rules.ts';
import { PastLabel } from './tournament-labels.ts';
import { TournamentStorageNotice } from './storage.ts';
import type { SavedTournaments } from './storage.ts';
import './tournament.css';

export function PastTournaments({ saved }: { saved: SavedTournaments }) {
  const newestFirst = [...saved.items].reverse();
  return (
    <section className="past" aria-labelledby="past-heading">
      <h3 id="past-heading">{PastLabel.heading}</h3>
      {!saved.available && <p className="storage-notice">{TournamentStorageNotice}</p>}
      {newestFirst.length === 0 ? (
        <p className="secondary">{PastLabel.empty}</p>
      ) : (
        <div className="table-scroll" role="region" aria-label="Finished tournaments" tabIndex={0}>
          <table className="results">
            <caption>{PastLabel.caption}</caption>
            <thead>
              <tr>
                {PastLabel.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((item, index) => (
                <tr key={index}>
                  <th scope="row">{nameOf(item, championOf(item))}</th>
                  <td>{nameOf(item, runnerUpOf(item))}</td>
                  <td>{item.players.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
