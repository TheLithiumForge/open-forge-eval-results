import { formatElapsed } from '../elapsed-time.ts';
import { playersFor, roundName, roundSize, winner } from './tournament.ts';
import type { TournamentState } from './tournament.ts';

export function Bracket({ tournament }: { tournament: TournamentState }) {
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
          {Array.from({ length: tournament.names.length - 1 }, (_, index) => {
            const match = tournament.matches[index];
            let players = match?.players;
            if (!players) {
              try {
                players = playersFor(tournament.names.length, tournament.matches, index);
              } catch {
                /* Future opponents are not known yet. */
              }
            }
            const name = (seed: number | undefined) =>
              seed === undefined ? 'To be decided' : tournament.names[seed];
            return [0, 1].map((position) => {
              const result = match?.results[position];
              return (
                <tr key={`${index}-${position}`}>
                  <td>
                    {position === 0
                      ? `${roundName(roundSize(tournament.names.length, index))} ${index + 1}`
                      : ''}
                  </td>
                  <td>{name(players?.[position])}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>
                    {position === 0 && match && match.results.length === 2
                      ? name(winner(match))
                      : ''}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
