import { formatElapsed } from '../elapsed-time.ts';
import { tournamentBracket } from './rules.ts';
import type { Tournament } from './rules.ts';

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <div className="tournament-table">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournamentBracket(tournament).flatMap((match, index) =>
            match.players.map((player, turn) => {
              const result = match.results[turn];
              return (
                <tr key={`${index}-${turn}`}>
                  <td>
                    {match.round} {index + 1}
                  </td>
                  <td>{player === null ? 'To be decided' : tournament.names[player]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>
                    {match.winner === null ? 'To be decided' : tournament.names[match.winner]}
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
