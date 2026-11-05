import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './rules.ts';
import type { TournamentData } from './rules.ts';

export function Bracket({ tournament }: { tournament: TournamentData }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, index) =>
            match.players.map((player, side) => {
              const result = match.results[side];
              return (
                <tr key={`${index}-${side}`}>
                  <td>
                    {roundName(tournament.names.length, index)} {index + 1}
                  </td>
                  <td>{player === null ? 'To be decided' : tournament.names[player]}</td>
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
