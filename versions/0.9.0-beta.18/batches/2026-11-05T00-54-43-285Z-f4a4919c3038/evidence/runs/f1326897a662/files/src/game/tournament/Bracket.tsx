import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, roundForMatch } from './rules.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div
      className="tournament-table-viewport"
      tabIndex={0}
      role="region"
      aria-label="Tournament bracket"
    >
      <table className="tournament-bracket">
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
        {tournament.matches.map((match, index) => {
          const winner = matchWinner(tournament, index);
          return (
            <tbody key={match.boardCode}>
              {matchPlayers(tournament, index).map((seed, turn) => {
                const result = match.results[turn];
                return (
                  <tr key={`${index}-${turn}`}>
                    {turn === 0 && (
                      <th scope="rowgroup" rowSpan={2}>
                        {index + 1}
                      </th>
                    )}
                    {turn === 0 && (
                      <td rowSpan={2}>{roundForMatch(tournament.players.length, index).name}</td>
                    )}
                    <td>{seed == null ? 'To be decided' : tournament.players[seed - 1]}</td>
                    <td>{result?.moves ?? '—'}</td>
                    <td>
                      {result ? (
                        <span title={`${result.elapsedMs} ms`}>
                          {formatElapsed(result.elapsedMs)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {turn === 0 && (
                      <td rowSpan={2}>{winner == null ? '—' : tournament.players[winner - 1]}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
