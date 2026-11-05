import { Bracket } from './Bracket.tsx';
import type { TournamentPlayer, TournamentRecord } from './model.ts';
import './tournament.css';

interface PastTournamentsProps {
  records: readonly TournamentRecord[];
}

function playerName(seed: number, players: readonly TournamentPlayer[]): string {
  return players.find((player) => player.seed === seed)?.name ?? 'Unknown';
}

export function PastTournaments({ records }: PastTournamentsProps) {
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {records.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={`${record.startedAtMs}-${record.rounds[0]?.matches[0]?.boardCode}`}>
              <details>
                <summary>
                  Champion: {playerName(record.championSeed, record.players)} ·{' '}
                  {record.players.length} players ·{' '}
                  <time dateTime={new Date(record.completedAtMs).toISOString()}>
                    {new Date(record.completedAtMs).toLocaleString()}
                  </time>
                </summary>
                <Bracket players={record.players} rounds={record.rounds} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
