import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './rules.ts';
import type { Tournament } from './rules.ts';
export function Bracket({ tournament }: { tournament: Tournament }) {
  const future: { players: [number | null, number | null] }[][] = [];
  let winners = tournament.rounds.at(-1)!.map((match) => match.winner);
  while (winners.length > 1) {
    const round: { players: [number | null, number | null] }[] = [];
    for (let i = 0; i < winners.length; i += 2)
      round.push({ players: [winners[i] ?? null, winners[i + 1] ?? null] });
    future.push(round);
    winners = round.map(() => null);
  }
  return (
    <div className="bracket">
      {tournament.rounds.map((round, i) => (
        <table key={i}>
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
            {round.map((match, j) =>
              match.players.map((player, slot) => (
                <tr key={`${j}-${slot}`}>
                  <td>{j + 1}</td>
                  <th scope="row">{tournament.names[player]}</th>
                  <td>{match.results[slot]?.moves ?? '—'}</td>
                  <td>
                    {match.results[slot] ? formatElapsed(match.results[slot]!.elapsedMs) : '—'}
                  </td>
                  <td>{match.winner === player ? 'Winner' : '—'}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ))}
      {future.map((round, i) => (
        <table key={`future-${i}`}>
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
            {round.map((match, j) =>
              match.players.map((player, slot) => (
                <tr key={`${j}-${slot}`}>
                  <td>{j + 1}</td>
                  <th scope="row">
                    {player === null ? 'To be decided' : tournament.names[player]}
                  </th>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}
