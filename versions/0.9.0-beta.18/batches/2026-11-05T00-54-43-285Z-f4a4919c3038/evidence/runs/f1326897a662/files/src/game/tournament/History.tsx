import { matchWinner } from './rules.ts';
import type { TournamentState } from './rules.ts';

interface HistoryProps {
  items: readonly TournamentState[];
  blocked: boolean;
  view(item: TournamentState): void;
}

export function History({ items, blocked, view }: HistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">Past tournaments</h3>
      {blocked && <p>Progress won't be saved on this device.</p>}
      {items.length === 0 && <p>No finished tournaments yet.</p>}
      <ul>
        {items.map((item, index) => {
          const winner = matchWinner(item, item.matches.length - 1);
          const champion = winner == null ? '' : item.players[winner - 1];
          return (
            <li key={item.matches.map((match) => match.boardCode).join(',')}>
              <span>
                {item.players.length} players · Champion: {champion}
              </span>
              <button
                className="control"
                type="button"
                onClick={() => view(item)}
                aria-label={`View tournament ${index + 1}, champion ${champion}`}
              >
                View tournament
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
