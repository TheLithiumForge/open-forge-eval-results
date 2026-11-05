import { champion } from './rules.ts';
import { BracketLabel, TournamentControl, TournamentNotice } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

interface PastTournamentsProps {
  records: readonly Tournament[];
  blocked: boolean;
}

// Newest first. Blocked storage says so where the saved records would be.
export function PastTournaments({ records, blocked }: PastTournamentsProps) {
  return (
    <div className="results">
      <table>
        <caption>
          <h3>{TournamentControl.past}</h3>
        </caption>
        <thead>
          <tr>
            <th scope="col">{BracketLabel.champion}</th>
            <th scope="col">{BracketLabel.players}</th>
          </tr>
        </thead>
        <tbody>
          {blocked && (
            <tr>
              <td colSpan={2}>{TournamentNotice.unsaved}</td>
            </tr>
          )}
          {!blocked && records.length === 0 && (
            <tr>
              <td colSpan={2}>{BracketLabel.noRecords}</td>
            </tr>
          )}
          {records.map((record, index) => (
            <tr key={index}>
              <td className="name">{record.players[champion(record) ?? -1]}</td>
              <td className="name">{record.players.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
