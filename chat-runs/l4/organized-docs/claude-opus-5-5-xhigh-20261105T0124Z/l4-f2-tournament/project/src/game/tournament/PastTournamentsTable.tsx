import { champion, matchSeeds, matchWinner, playerName } from './rules.ts';
import { TournamentColumn, TournamentText } from './tournament-labels.ts';
import type { PastTournaments } from './records.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

const COLUMNS = [TournamentColumn.champion, TournamentColumn.runnerUp, TournamentColumn.players];

function runnerUp(tournament: Tournament): string {
  const final = tournament.matches.length - 1;
  const winner = matchWinner(tournament, final);
  const other = matchSeeds(tournament, final)?.find((seed) => seed !== winner);
  return other === undefined ? '' : playerName(tournament, other);
}

// Finished tournaments, newest first. When this device can't keep them, the notice says so.
export function PastTournamentsTable({ past }: { past: PastTournaments }) {
  return (
    <section className="tournament-past">
      <div className="tournament-table">
        <table>
          <caption>{TournamentText.past}</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {past.records.map((record, index) => (
              <tr key={index}>
                <td>{champion(record)}</td>
                <td>{runnerUp(record)}</td>
                <td>{record.players.join(', ')}</td>
              </tr>
            ))}
            {past.records.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length}>{TournamentText.noRecords}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!past.saving && <p className="tournament-unsaved">{TournamentText.unsaved}</p>}
    </section>
  );
}
