import { Bracket } from './Bracket.tsx';
import type { TournamentTransfer } from './format.ts';

interface TournamentHistoryProps {
  available: boolean;
  records: readonly TournamentTransfer[];
}

function champion(record: TournamentTransfer): string {
  return record.tournament?.rounds.at(-1)?.matches[0]?.winner ?? 'Unknown';
}

export function TournamentHistory({ available, records }: TournamentHistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {!available && <p>Progress won't be saved on this device.</p>}
      {records.length === 0 ? (
        <p>No past tournaments.</p>
      ) : (
        <ol>
          {records.map((record, index) => (
            <li key={`${champion(record)}-${index}`}>
              <p>
                {record.tournament?.playerCount ?? record.setup.playerCount} players. Champion:{' '}
                {champion(record)}
              </p>
              <details>
                <summary>View bracket</summary>
                {record.tournament && <Bracket tournament={record.tournament} />}
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
