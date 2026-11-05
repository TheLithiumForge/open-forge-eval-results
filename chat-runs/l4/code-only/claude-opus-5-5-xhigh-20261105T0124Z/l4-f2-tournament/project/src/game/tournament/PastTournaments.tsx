import { parseBoardCode } from '../deck.ts';
import { champion } from './bracket.ts';
import { championLine, TournamentControl, TournamentNotice } from './tournament-labels.ts';
import type { Tournament } from './bracket.ts';

interface PastTournamentsProps {
  past: readonly Tournament[];
}

// Newest first. Each entry names its champion, its players and its board size.
export function PastTournaments({ past }: PastTournamentsProps) {
  const entries = past.map((tournament, index) => ({ tournament, index })).reverse();
  return (
    <section className="past-tournaments" aria-labelledby="past-tournaments-title">
      <h3 id="past-tournaments-title">{TournamentControl.past}</h3>
      {entries.length === 0 ? (
        <p className="help">{TournamentNotice.noPast}</p>
      ) : (
        <ol>
          {entries.map(({ tournament, index }) => {
            const winner = champion(tournament);
            const size = parseBoardCode(tournament.matches[0]?.boardCode ?? '')?.size;
            return (
              <li key={index}>
                <span className="past-champion">
                  {championLine(winner === null ? '' : (tournament.players[winner] ?? ''))}
                </span>{' '}
                <span className="past-detail">
                  {tournament.players.join(', ')}
                  {size === undefined ? '' : `, ${size}x${size}`}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
