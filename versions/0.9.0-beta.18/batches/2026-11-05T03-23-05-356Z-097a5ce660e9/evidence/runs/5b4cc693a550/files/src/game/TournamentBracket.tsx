import { formatElapsed } from './elapsed-time.ts';
import { opening, playersFor, roundFor } from './tournament.ts';
import type { TournamentState } from './tournament.ts';
export function TournamentBracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="bracket">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
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
          {Array.from({ length: tournament.names.length - 1 }, (_, index) => {
            const entry = tournament.matches[index];
            const pair =
              entry?.players ??
              playersFor(tournament, index) ??
              opening(tournament.names.length)[index];
            return (
              <tr key={index}>
                <td>{roundFor(tournament.names.length, index).name}</td>
                <td>{pair ? tournament.names[pair[0]] : 'TBD'}</td>
                <td>{entry?.results[0]?.moves ?? '—'}</td>
                <td>{entry?.results[0] ? formatElapsed(entry.results[0].elapsedMs) : '—'}</td>
                <td>{pair ? tournament.names[pair[1]] : 'TBD'}</td>
                <td>{entry?.results[1]?.moves ?? '—'}</td>
                <td>{entry?.results[1] ? formatElapsed(entry.results[1].elapsedMs) : '—'}</td>
                <td>{entry?.winner != null ? tournament.names[entry.winner] : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
