import type { TournamentState } from './model.ts';

interface HistoryProps {
  items: readonly TournamentState[];
  blocked: boolean;
  view(tournament: TournamentState): void;
}

export function History({ items, blocked, view }: HistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">Past tournaments</h3>
      {blocked && <p>Progress won't be saved on this device.</p>}
      {items.length === 0 && <p>No past tournaments.</p>}
      {items.map((tournament, index) => (
        <button className="control" type="button" key={index} onClick={() => view(tournament)}>
          {tournament.names.length} players — Champion:{' '}
          {tournament.names[tournament.matches.at(-1)!.winner!]}
        </button>
      ))}
    </section>
  );
}
