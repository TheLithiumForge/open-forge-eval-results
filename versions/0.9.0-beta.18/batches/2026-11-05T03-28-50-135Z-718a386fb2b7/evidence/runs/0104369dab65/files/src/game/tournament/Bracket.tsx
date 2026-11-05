import { formatElapsed } from '../elapsed-time.ts';
import { opening, roundName } from './rules.ts';
import type { TournamentState } from './rules.ts';

export function Bracket({ t }: { t: TournamentState }) {
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
            <th scope="col">Opponent</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: t.names.length - 1 }, (_, index) => {
            const m = t.matches[index];
            const seeds = opening(t.names.length)[index];
            return (
              <tr key={index}>
                <td>{roundName(t.names.length, index)}</td>
                <td>{m ? t.names[m.players[0]] : seeds ? t.names[seeds[0]] : '—'}</td>
                <td>{m?.results[0]?.moves ?? '—'}</td>
                <td>{m?.results[0] ? formatElapsed(m?.results[0].elapsedMs) : '—'}</td>
                <td>{m ? t.names[m.players[1]] : seeds ? t.names[seeds[1]] : '—'}</td>
                <td>{m?.results[1]?.moves ?? '—'}</td>
                <td>{m?.results[1] ? formatElapsed(m?.results[1].elapsedMs) : '—'}</td>
                <td>{m?.winner == null ? '—' : t.names[m.winner]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
