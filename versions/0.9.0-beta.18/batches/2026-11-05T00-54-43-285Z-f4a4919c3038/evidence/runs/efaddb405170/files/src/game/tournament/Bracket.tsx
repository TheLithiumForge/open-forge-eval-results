import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchStage, matchWinner } from './rules.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ state }: { state: TournamentState }) {
  return (
    <div className="tournament-table" tabIndex={0} role="region" aria-label="Tournament bracket">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.matches.flatMap((match, index) => {
            const winner = matchWinner(state, index);
            return matchPlayers(state, index).map((player, turn) => {
              const result = match.results[turn];
              return (
                <tr key={`${index}-${turn}`}>
                  <td>
                    {matchStage(state.players.length, index).round} {index + 1}
                  </td>
                  <td>
                    {player == null ? 'To be decided' : state.players[player]}
                    {player != null && player === winner ? ' (winner)' : ''}
                  </td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{winner == null ? 'Pending' : state.players[winner]}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
