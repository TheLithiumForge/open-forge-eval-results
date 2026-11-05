import { Fragment } from 'react';
import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament } from './model.ts';
export function Bracket({ event }: { event: Tournament }) {
  return (
    <div className="bracket">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {event.matches.map((m, i) => (
            <tr key={i}>
              <td>
                {i < event.names.length / 2
                  ? event.names.length === 8
                    ? 'Quarterfinal'
                    : 'Semifinal'
                  : i < event.matches.length - 1
                    ? 'Semifinal'
                    : 'Final'}
              </td>
              {m.players.map((player, j) => (
                <Fragment key={j}>
                  <td>{player === null ? 'TBD' : event.names[player]}</td>
                  <td>{m.results[j]?.moves ?? '—'}</td>
                  <td>{m.results[j] ? formatElapsed(m.results[j]!.elapsedMs) : '—'}</td>
                </Fragment>
              ))}
              <td>{m.winner === null ? '—' : event.names[m.winner]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
