import { TournamentColumn, TournamentText } from './labels.ts';
import { championOf } from './rules.ts';
import type { SavedTournaments } from './storage.ts';
import './tournament.css';

// Saved records, with the unsaved-progress notice in their place when storage is blocked.
export function PastTournaments({ past }: { past: SavedTournaments }) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">{TournamentText.past}</h3>
      {!past.available && <p className="help">{TournamentText.unsaved}</p>}
      {past.items.length > 0 ? (
        <div className="table-scroll">
          <table className="results">
            <caption>{TournamentText.pastCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{TournamentColumn.champion}</th>
                <th scope="col">{TournamentColumn.players}</th>
              </tr>
            </thead>
            <tbody>
              {past.items.map((tournament, index) => (
                <tr key={index}>
                  <td>{tournament.players[championOf(tournament) ?? -1]}</td>
                  <td>{tournament.players.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        past.available && <p className="help">{TournamentText.noPast}</p>
      )}
    </section>
  );
}
