import { championLine, TournamentControl, TournamentText } from './tournament-labels.ts';
import { champion, gridSize } from './tournament.ts';
import type { Tournament } from './tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface PastTournamentsProps {
  past: readonly Tournament[];
  view(tournament: Tournament): void;
}

export function PastTournaments({ past, view }: PastTournamentsProps) {
  return (
    <section aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">{TournamentText.past}</h3>
      {past.length === 0 ? (
        <p className="note">{TournamentText.noPast}</p>
      ) : (
        <ul className="past-list">
          {past.map((tournament) => {
            const winner = champion(tournament) ?? '';
            const size = gridSize(tournament);
            return (
              <li key={tournament.matches.map((match) => match.boardCode).join(' ')}>
                <span className="past-result">{championLine(winner)}</span>
                <span className="note">
                  {tournament.players.length} players, {size}x{size}
                </span>
                <button
                  type="button"
                  className="control"
                  aria-label={`${TournamentControl.viewBracket}, champion ${winner}`}
                  onClick={() => view(tournament)}
                >
                  {TournamentControl.viewBracket}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
