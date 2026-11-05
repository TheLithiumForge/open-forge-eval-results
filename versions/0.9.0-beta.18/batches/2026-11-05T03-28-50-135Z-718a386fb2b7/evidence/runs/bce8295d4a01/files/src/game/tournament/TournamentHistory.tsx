import { tournamentPlayer } from './results.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import type { TournamentState } from './types.ts';

interface TournamentHistoryProps {
  readonly items: readonly TournamentState[];
  readonly available: boolean;
}

export function TournamentHistory({ items, available }: TournamentHistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments-heading">
      <h3 id="past-tournaments-heading">Past tournaments</h3>
      {!available && <p>Progress won't be saved on this device.</p>}
      {items.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ul className="tournament-history-list">
          {items.map((item) => (
            <li key={`${item.completedAt}-${item.championSeed}`}>
              <details>
                <summary>
                  Champion: {tournamentPlayer(item, item.championSeed)?.name} ·{' '}
                  {item.completedAt?.slice(0, 10)}
                </summary>
                <TournamentBracket tournament={item} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
