import { formatElapsed } from '../elapsed-time.ts';
import { tournamentRound } from './rules.ts';
import type { TournamentState } from './model.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div
      className="tournament-table"
      tabIndex={0}
      role="region"
      aria-label="Scrollable tournament bracket"
    >
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {['Match', 'Round', 'Player', 'Moves', 'Time', 'Winner'].map((title) => (
              <th scope="col" key={title}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournament.matches.flatMap((match, index) =>
            [0, 1].map((position) => {
              const player = match.players[position];
              const result = match.results[position];
              return (
                <tr key={`${index}-${position}`}>
                  <td>{index + 1}</td>
                  <td>{tournamentRound(tournament.names.length, index).name}</td>
                  <td>{player === undefined ? 'To be decided' : tournament.names[player]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{match.winner === null ? '—' : tournament.names[match.winner]}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
