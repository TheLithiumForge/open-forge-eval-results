import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, tournamentRound } from './rules.ts';
import type { Tournament } from './types.ts';

export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  return (
    <div className="tournament-table" tabIndex={0} role="region" aria-label="Tournament bracket">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Player', 'Moves', 'Time', 'Winner'].map((name) => (
              <th scope="col" key={name}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        {tournament.matches.map((match, index) => {
          const winner = matchWinner(tournament, index);
          return (
            <tbody key={index}>
              {matchPlayers(tournament, index).map((seed, turn) => {
                const result = match.results[turn];
                return (
                  <tr key={`${index}-${turn}`}>
                    {turn === 0 && (
                      <th scope="rowgroup" rowSpan={2}>
                        {tournamentRound(tournament.players.length, index).name} {index + 1}
                      </th>
                    )}
                    <td>{seed === null ? 'To be decided' : tournament.players[seed]}</td>
                    <td>{result?.moves ?? '—'}</td>
                    <td>
                      {result ? (
                        <span title={`${result.elapsedMs} ms`}>
                          {formatElapsed(result.elapsedMs)} ({result.elapsedMs.toFixed(3)} ms)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {turn === 0 && (
                      <td rowSpan={2}>
                        {winner === null ? 'To be decided' : tournament.players[winner]}
                      </td>
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
