import { TournamentBracket } from './TournamentBracket.tsx';
import type { TournamentRecord } from './model.ts';
import './tournament.css';

export function TournamentHistory({
  items,
  available,
}: {
  items: readonly TournamentRecord[];
  available: boolean;
}) {
  return (
    <section className="tournament-history" aria-labelledby="past-tournaments-title">
      <h3 id="past-tournaments-title">Past tournaments</h3>
      {!available && <p>Progress won't be saved on this device.</p>}
      {items.length === 0 ? (
        <p>No past tournaments yet.</p>
      ) : (
        <ol>
          {items.map((record, index) => {
            const champion = record.players.find(
              (player) => player.seed === record.rounds.at(-1)?.matches[0]?.winnerSeed,
            );
            return (
              <li key={`${champion?.seed ?? 0}-${index}`}>
                <details>
                  <summary>
                    Champion: {champion?.name ?? 'Unknown'} · {record.playerCount} players
                  </summary>
                  <TournamentBracket record={record} />
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
