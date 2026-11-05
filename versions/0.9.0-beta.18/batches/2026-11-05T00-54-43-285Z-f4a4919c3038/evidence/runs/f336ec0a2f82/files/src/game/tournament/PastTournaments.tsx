import type { TournamentState } from './tournament.ts';

interface PastTournamentsProps {
  past: readonly TournamentState[];
  view(tournament: TournamentState): void;
}

export function PastTournaments({ past, view }: PastTournamentsProps) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-heading">
      <h2 id="past-tournaments-heading">Past tournaments</h2>
      {past.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ul>
          {past.map((entry) => {
            const winner = entry.matches.at(-1)?.winner;
            return (
              <li key={entry.id}>
                <p>Champion: {winner == null ? '' : entry.players[winner]}</p>
                <p className="help">
                  {entry.players.length} players · {entry.players.join(', ')}
                </p>
                <button type="button" className="control" onClick={() => view(entry)}>
                  View tournament
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
