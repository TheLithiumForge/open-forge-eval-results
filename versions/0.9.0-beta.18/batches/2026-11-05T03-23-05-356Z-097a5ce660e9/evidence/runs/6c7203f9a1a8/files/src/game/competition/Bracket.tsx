import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament } from './rules.ts';

interface BracketProps {
  tournament: Tournament;
}

function resultValue(value: number | undefined, format: (value: number) => string): string {
  return value === undefined ? '—' : format(value);
}

export function Bracket({ tournament }: BracketProps) {
  return (
    <div className="tournament-table-scroll">
      <table className="tournament-bracket">
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Match</th>
            <th scope="col">Player 1</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Player 2</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.rounds.flatMap((round, roundIndex) =>
            round.matches.map((match, matchIndex) => (
              <tr key={`${roundIndex}-${matchIndex}`}>
                <td>{round.name}</td>
                <td>{matchIndex + 1}</td>
                <td>{match.players[0] ?? 'TBD'}</td>
                <td>{resultValue(match.results[0]?.moves, String)}</td>
                <td>{resultValue(match.results[0]?.elapsedMs, formatElapsed)}</td>
                <td>{match.players[1] ?? 'TBD'}</td>
                <td>{resultValue(match.results[1]?.moves, String)}</td>
                <td>{resultValue(match.results[1]?.elapsedMs, formatElapsed)}</td>
                <td>{match.winner ?? '—'}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
