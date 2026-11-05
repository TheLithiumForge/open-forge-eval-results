import { TournamentBracket } from './TournamentBracket.tsx';
import type { Tournament } from './tournament.ts';

interface TournamentHistoryProps {
  readonly available: boolean;
  readonly tournaments: readonly Tournament[];
}

export function TournamentHistory({ available, tournaments }: TournamentHistoryProps) {
  return (
    <section className="tournament-history" aria-labelledby="tournament-history-title">
      <h3 id="tournament-history-title">Past tournaments</h3>
      {!available && <p className="tournament-storage-warning">Progress won't be saved on this device.</p>}
      {tournaments.length === 0 ? (
        <p>No finished tournaments yet.</p>
      ) : (
        <ol>
          {tournaments.map((past, index) => (
            <li key={`${past.playerCount}-${past.champion?.seed ?? 0}-${index}`}>
              <details>
                <summary>{past.playerCount} players · Champion: {past.champion?.name}</summary>
                <TournamentBracket current={null} rounds={past.rounds} />
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
