import { formatElapsed } from '../elapsed-time.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="tournament-table">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Round', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {tournament.matches.map((match, index) => (
          <tbody key={index}>
            {match.players.map((player, turn) => (
              <tr key={`${index}-${turn}`}>
                {turn === 0 && (
                  <>
                    <th scope="rowgroup" rowSpan={2}>
                      {index + 1}
                    </th>
                    <td rowSpan={2}>
                      {match.round}
                      <br />
                      {match.size}x{match.size}
                    </td>
                  </>
                )}
                <td>
                  {player === null
                    ? `Winner of match ${(index - tournament.players.length / 2) * 2 + turn + 1}`
                    : tournament.players[player]}
                </td>
                <td>{match.results[turn]?.moves ?? '—'}</td>
                <td>{match.results[turn] ? formatElapsed(match.results[turn].elapsedMs) : '—'}</td>
                {turn === 0 && (
                  <td rowSpan={2}>
                    {match.winner === null ? 'Pending' : tournament.players[match.winner]}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
