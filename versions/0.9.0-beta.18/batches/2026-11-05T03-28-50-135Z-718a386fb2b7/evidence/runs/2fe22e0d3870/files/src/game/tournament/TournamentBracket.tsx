import type { TournamentRecord } from './model.ts';
import './tournament.css';

interface TournamentBracketProps {
  record: TournamentRecord;
}

function playerName(
  record: TournamentRecord,
  seed: number | null,
  roundIndex: number,
  matchIndex: number,
  slot: number,
): string {
  if (seed !== null) return record.players[seed - 1]?.name ?? 'Unknown player';
  if (roundIndex === 0) return 'TBD';
  const previous = record.rounds[roundIndex - 1];
  return `Winner of ${previous?.name ?? 'previous round'} ${matchIndex * 2 + slot + 1}`;
}

function resultValue(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

function formatMatchTime(milliseconds: number | undefined): string {
  if (milliseconds === undefined) return '—';
  const totalMicroseconds = Math.floor(milliseconds * 1000);
  const minutes = Math.floor(totalMicroseconds / 60_000_000);
  const seconds = Math.floor((totalMicroseconds % 60_000_000) / 1_000_000);
  const remainder = totalMicroseconds % 1_000_000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(remainder).padStart(6, '0')}`;
}

export function TournamentBracket({ record }: TournamentBracketProps) {
  return (
    <div
      className="tournament-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Tournament bracket results"
    >
      <table className="tournament-bracket">
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Match</th>
            <th scope="col">Player A</th>
            <th scope="col">A moves</th>
            <th scope="col">A time</th>
            <th scope="col">Player B</th>
            <th scope="col">B moves</th>
            <th scope="col">B time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {record.rounds.flatMap((round, roundIndex) =>
            round.matches.map((match, matchIndex) => {
              const first = match.results[0];
              const second = match.results[1];
              const winner = record.players.find(
                (player) => player.seed === match.winnerSeed,
              )?.name;
              return (
                <tr key={`${round.name}-${matchIndex}`}>
                  <th scope="row">{round.name}</th>
                  <td>{matchIndex + 1}</td>
                  <td>{playerName(record, match.players[0], roundIndex, matchIndex, 0)}</td>
                  <td>{resultValue(first?.moves)}</td>
                  <td>{formatMatchTime(first?.elapsedMs)}</td>
                  <td>{playerName(record, match.players[1], roundIndex, matchIndex, 1)}</td>
                  <td>{resultValue(second?.moves)}</td>
                  <td>{formatMatchTime(second?.elapsedMs)}</td>
                  <td>{winner ?? '—'}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
