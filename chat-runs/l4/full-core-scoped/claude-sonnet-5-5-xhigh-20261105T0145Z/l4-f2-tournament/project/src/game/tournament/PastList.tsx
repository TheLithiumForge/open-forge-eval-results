import { champion } from './rules.ts';
import { BLOCKED_NOTICE } from './storage.ts';
import { TournamentControl } from './tournament-labels.ts';
import type { PastTournaments } from './storage.ts';

export function PastList({ past }: { past: PastTournaments }) {
  return (
    <section className="past" aria-labelledby="past-tournaments">
      <h3 id="past-tournaments">{TournamentControl.past}</h3>
      {past.blocked && <p>{BLOCKED_NOTICE}</p>}
      {past.records.length === 0 ? (
        <p className="help">No past tournaments yet.</p>
      ) : (
        <ul>
          {past.records.map((record, index) => (
            <li key={index}>
              <span>Champion: {record.players[champion(record) ?? 0]}</span>{' '}
              <span className="detail">{record.players.length} players</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
