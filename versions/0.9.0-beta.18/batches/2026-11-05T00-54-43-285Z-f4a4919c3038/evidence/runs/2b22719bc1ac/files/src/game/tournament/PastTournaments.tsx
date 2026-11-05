import type { TournamentState } from './rules.ts';

interface PastTournamentsProps {
  items: readonly TournamentState[];
  blocked: boolean;
  open(tournament: TournamentState): void;
}
export function PastTournaments({ items, blocked, open }: PastTournamentsProps) {
  return (
    <section className="past-tournaments">
      <h3>Past tournaments</h3>
      {blocked && <p>Progress won't be saved on this device.</p>}
      {items.length === 0 && <p>No finished tournaments yet.</p>}
      <ol>
        {items.map((item, i) => {
          const winner = item.matches.at(-1)?.winner;
          return (
            <li key={i}>
              <button className="control" type="button" onClick={() => open(item)}>
                Champion: {winner === undefined || winner === null ? '' : item.players[winner]} ·{' '}
                {item.players.length} players
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
