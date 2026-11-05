import { tournamentBracket } from './bracket.ts';
import type { TournamentRecord } from './tournament.ts';

interface PastTournamentsProps {
  records: readonly TournamentRecord[];
  view(record: TournamentRecord): void;
}

export function PastTournaments({ records, view }: PastTournamentsProps) {
  return (
    <section className="past-tournaments" aria-labelledby="past-title">
      <h3 id="past-title">Past tournaments</h3>
      {records.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ul>
          {records.map((record) => {
            const winner = tournamentBracket(record).at(-1)?.winner;
            return (
              <li key={record.id}>
                <span>
                  Champion: {winner !== null && winner !== undefined ? record.players[winner] : ''}{' '}
                  · {record.players.length} players · {new Date(record.createdAt).toLocaleString()}
                </span>
                <button type="button" className="control" onClick={() => view(record)}>
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
