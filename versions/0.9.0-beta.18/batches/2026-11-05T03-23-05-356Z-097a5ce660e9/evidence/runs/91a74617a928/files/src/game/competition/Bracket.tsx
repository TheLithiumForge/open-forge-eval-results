import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './tournament.ts';
import type { Tournament } from './tournament.ts';

export function Bracket({ tournament: t }: { tournament: Tournament }) {
  return (
    <>
      <h3>Bracket</h3>
      {t.rounds.map((round, r) => (
        <div key={r}>
          <h4>{roundName(round.length)}</h4>
          <div className="tournament-table">
            <table>
              <caption>{roundName(round.length)} matches</caption>
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
                {round.flatMap((m, i) =>
                  m.players.map((player, p) => (
                    <tr key={`${i}-${p}`}>
                      <td>{i + 1}</td>
                      <th scope="row">{t.names[player]}</th>
                      <td>{m.results[p]?.moves ?? '—'}</td>
                      <td>{m.results[p] ? formatElapsed(m.results[p]!.elapsedMs) : '—'}</td>
                      <td>{m.winner === player ? t.names[player] : '—'}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {t.rounds.at(-1)!.length > 1 &&
        Array.from({ length: Math.log2(t.rounds.at(-1)!.length) }, (_, index) => {
          const matches = t.rounds.at(-1)!.length / 2 ** (index + 1);
          return (
            <div key={index}>
              <h4>{roundName(matches)}</h4>
              <p>
                {Array.from({ length: matches }, (_, i) => `Match ${i + 1}: To be decided`).join(
                  ' · ',
                )}
              </p>
            </div>
          );
        })}
    </>
  );
}
