import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, roundFor } from './rules.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ state }: { state: TournamentState }) {
  return (
    <div
      className="tournament-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Tournament bracket"
    >
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Round', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.matches.flatMap((match, index) => {
            const players = matchPlayers(state, index);
            const winner = matchWinner(state, index);
            return [0, 1].map((turn) => {
              const player = players[turn];
              const result = match.results[turn];
              return (
                <tr key={`${index}-${turn}`}>
                  <td>{index + 1}</td>
                  <td>{roundFor(state.names.length, index).name}</td>
                  <td>
                    {player === undefined ? 'To be decided' : state.names[player]}
                    {player !== undefined && player === winner ? ' (winner)' : ''}
                  </td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{winner === null ? '—' : state.names[winner]}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
