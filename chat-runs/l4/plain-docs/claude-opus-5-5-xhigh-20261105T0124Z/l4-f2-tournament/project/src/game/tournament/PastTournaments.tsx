import { champion } from './rules.ts';
import { TournamentTable } from './tournament-labels.ts';
import type { SavedTournaments } from './past-tournaments.ts';

// Finished tournaments, newest first. Without browser storage they last for this visit only.
export function PastTournaments({ records, saving }: SavedTournaments) {
  return (
    <>
      <table className="tournament-table">
        <caption>{TournamentTable.past}</caption>
        <thead>
          <tr>
            <th scope="col">{TournamentTable.entrants}</th>
            <th scope="col">{TournamentTable.champion}</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map((record, index) => (
              <tr key={index}>
                <td>{record.players.join(', ')}</td>
                <td>{champion(record)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2}>{TournamentTable.noRecords}</td>
            </tr>
          )}
        </tbody>
      </table>
      {!saving && <p className="tournament-note">{TournamentTable.notSaved}</p>}
    </>
  );
}
