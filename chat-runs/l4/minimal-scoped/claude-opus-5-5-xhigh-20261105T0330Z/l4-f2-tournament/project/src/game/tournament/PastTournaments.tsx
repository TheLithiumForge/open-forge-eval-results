import { champion } from './rules.ts';
import { TournamentText } from './tournament-labels.ts';
import type { SavedTournaments } from './records.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

function summary(tournament: Tournament): string {
  const winner = champion(tournament);
  const names = tournament.players.map((name, player) =>
    player === winner ? `${name} ${TournamentText.winner}` : name,
  );
  return `${tournament.players.length} players: ${names.join(', ')}`;
}

// Saved records appear here, and so does the notice when the browser won't keep them.
export function PastTournaments({ saved }: { saved: SavedTournaments }) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">{TournamentText.past}</h3>
      {!saved.saving && <p>{TournamentText.unsaved}</p>}
      {saved.items.length ? (
        <ol>
          {saved.items.map((tournament, index) => (
            <li key={index}>{summary(tournament)}</li>
          ))}
        </ol>
      ) : (
        <p>{TournamentText.noPast}</p>
      )}
    </section>
  );
}
