import { formatElapsed } from '../elapsed-time.ts';
import { matchRound } from './rules.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="bracket-scroll">
      <table className="bracket">
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
        <tbody>
          {tournament.matches.flatMap((match, index) =>
            [0, 1].map((slot) => {
              const player = match.players[slot];
              const result = match.results[slot];
              return (
                <tr key={`${index}-${slot}`}>
                  <td>{index + 1}</td>
                  <td>{matchRound(tournament.players.length, index).name}</td>
                  <td>{player === undefined ? 'To be decided' : tournament.players[player]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{match.winner === null ? '—' : tournament.players[match.winner]}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
