import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, roundFor } from './rules.ts';
import type { TournamentState } from './model.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="bracket-scroll">
      <table className="tournament-bracket">
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Round', 'Match', 'Player', 'Moves', 'Time', 'Winner'].map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournament.matches.flatMap((match, index) => {
            const players = matchPlayers(tournament, index);
            const winner = matchWinner(tournament, index);
            return players.map((seed, turn) => {
              const result = match.results[turn];
              return (
                <tr key={`${index}-${turn}`}>
                  {turn === 0 && (
                    <td rowSpan={2}>{roundFor(tournament.players.length, index).name}</td>
                  )}
                  {turn === 0 && (
                    <td rowSpan={2}>
                      {index + 1}
                      <small>{match.boardCode}</small>
                    </td>
                  )}
                  <td>{seed === null ? 'To be decided' : tournament.players[seed - 1]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  {turn === 0 && (
                    <td rowSpan={2}>{winner === null ? '—' : tournament.players[winner - 1]}</td>
                  )}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
