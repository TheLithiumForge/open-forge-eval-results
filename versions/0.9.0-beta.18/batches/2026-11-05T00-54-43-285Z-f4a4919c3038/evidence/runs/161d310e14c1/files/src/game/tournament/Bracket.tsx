import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, tournamentRound } from './pairing.ts';
import type { TournamentState } from './model.ts';

export function Bracket({ state }: { state: TournamentState }) {
  return (
    <div className="tournament-table">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Round', 'Match', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
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
            return [0, 1].map((position) => {
              const seed = players[position];
              const name = seed ? state.names[seed - 1] : 'To be decided';
              const result = match.results[position];
              return (
                <tr key={`${index}-${position}`}>
                  {position === 0 && (
                    <>
                      <td rowSpan={2}>{tournamentRound(state.names.length, index).name}</td>
                      <td rowSpan={2}>{index + 1}</td>
                    </>
                  )}
                  <td>
                    {name}
                    {seed === winner ? ' (winner)' : ''}
                  </td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  {position === 0 && <td rowSpan={2}>{winner ? state.names[winner - 1] : '—'}</td>}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
