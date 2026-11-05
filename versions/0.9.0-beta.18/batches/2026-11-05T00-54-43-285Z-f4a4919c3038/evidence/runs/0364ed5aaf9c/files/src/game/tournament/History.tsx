import { tournamentBracket } from './rules.ts';
import type { Tournament } from './rules.ts';

interface HistoryProps {
  history: { items: readonly Tournament[]; blocked: boolean };
  open(item: Tournament): void;
}

export function TournamentHistory({ history, open }: HistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">Past tournaments</h3>
      {history.blocked && <p>Progress won't be saved on this device.</p>}
      {history.items.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ul>
          {history.items.map((item, index) => {
            const winner = tournamentBracket(item).at(-1)?.winner;
            return (
              <li key={index}>
                <button className="control" type="button" onClick={() => open(item)}>
                  {item.names.length} players · Champion: {winner == null ? '' : item.names[winner]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
