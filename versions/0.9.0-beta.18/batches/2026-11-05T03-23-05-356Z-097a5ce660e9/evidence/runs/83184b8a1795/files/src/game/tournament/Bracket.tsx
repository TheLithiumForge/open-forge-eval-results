import { formatElapsed } from '../elapsed-time.ts';
import { roundName, winner } from './model.ts';
import type { TournamentState } from './model.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="tournament-table">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Match</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: tournament.names.length - 1 }, (_, i) => {
            const match = tournament.matches[i],
              won = match ? winner(match) : null;
            return [0, 1].map((j) => {
              const player = match?.players[j],
                result = match?.results[j];
              return (
                <tr key={`${i}-${j}`}>
                  <td>
                    {roundName(tournament.names.length, i)} {i + 1}
                  </td>
                  <td>{player === undefined ? 'To be decided' : tournament.names[player]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{won === null ? '—' : tournament.names[won]}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
