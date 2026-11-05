import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './rules.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <section aria-label="Bracket">
      <h3>Bracket</h3>
      {tournament.matches.map((round, index) => (
        <div className="table-wrap" key={index}>
          <table>
            <caption>{roundName(round.length)}</caption>
            <thead>
              <tr>
                <th scope="col">Match</th>
                <th scope="col">Player</th>
                <th scope="col">Moves</th>
                <th scope="col">Time</th>
                <th scope="col">Winner</th>
              </tr>
            </thead>
            <tbody>
              {round.flatMap((match, matchIndex) =>
                match.players.map((seed, playerIndex) => (
                  <tr key={`${matchIndex}-${playerIndex}`}>
                    <td>{matchIndex + 1}</td>
                    <td>{seed ? tournament.names[seed - 1] : 'TBD'}</td>
                    <td>{match.results[playerIndex]?.moves ?? '—'}</td>
                    <td>
                      {match.results[playerIndex]
                        ? formatElapsed(match.results[playerIndex]!.elapsedMs)
                        : '—'}
                    </td>
                    <td>
                      {playerIndex === 0 && match.winner ? tournament.names[match.winner - 1] : '—'}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
