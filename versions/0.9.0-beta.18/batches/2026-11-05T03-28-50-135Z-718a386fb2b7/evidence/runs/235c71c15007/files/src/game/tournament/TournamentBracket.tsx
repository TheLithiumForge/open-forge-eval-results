import { useId } from 'react';
import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament, TournamentMatch, TournamentPlayer } from './tournament.ts';

interface TournamentBracketProps {
  readonly current: Tournament['current'];
  readonly rounds: Tournament['rounds'];
}

export function TournamentBracket({ current, rounds }: TournamentBracketProps) {
  const titleId = useId();
  return (
    <section className="tournament-bracket" aria-labelledby={titleId}>
      <h3 id={titleId}>Bracket</h3>
      {rounds.map((round, roundIndex) => (
        <div
          className="tournament-table-scroll"
          key={round.name}
          role="region"
          aria-label={`${round.name} results`}
          tabIndex={0}
        >
          <table className="tournament-table">
            <caption>{round.name}</caption>
            <thead>
              <tr>
                <th scope="col">Match</th>
                <th scope="col">Player</th>
                <th scope="col">Moves</th>
                <th scope="col">Time</th>
                <th scope="col">Winner</th>
              </tr>
            </thead>
            {round.matches.map((match, matchIndex) => (
              <tbody
                key={match.boardCode}
                className={current?.round === roundIndex && current.match === matchIndex ? 'current-match' : undefined}
              >
                {[0, 1].map((playerIndex) => (
                  <MatchPlayerRow
                    key={playerIndex}
                    isCurrent={current?.round === roundIndex && current.match === matchIndex}
                    match={match}
                    matchIndex={matchIndex}
                    playerIndex={playerIndex as 0 | 1}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      ))}
    </section>
  );
}

interface MatchPlayerRowProps {
  readonly isCurrent: boolean;
  readonly match: TournamentMatch;
  readonly matchIndex: number;
  readonly playerIndex: 0 | 1;
}

function MatchPlayerRow({ isCurrent, match, matchIndex, playerIndex }: MatchPlayerRowProps) {
  const player: TournamentPlayer | null = match.players[playerIndex];
  const result = match.results[playerIndex];
  return (
    <tr>
      {playerIndex === 0 && (
        <th scope="rowgroup" rowSpan={2}>
          Match {matchIndex + 1}{isCurrent ? ' (Current)' : ''}
        </th>
      )}
      <th scope="row">{player ? `${player.name} (Seed ${player.seed})` : 'TBD'}</th>
      <td>{result?.moves ?? '—'}</td>
      <td>
        {result ? `${formatElapsed(result.elapsedMs)} (${result.elapsedMs.toFixed(3)} ms)` : '—'}
      </td>
      {playerIndex === 0 && <td rowSpan={2}>{match.winner?.name ?? '—'}</td>}
    </tr>
  );
}
