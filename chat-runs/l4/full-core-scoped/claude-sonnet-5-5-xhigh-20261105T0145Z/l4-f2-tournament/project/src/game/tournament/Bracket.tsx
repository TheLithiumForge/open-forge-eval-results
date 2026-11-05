import { bracketRows } from './bracket.ts';
import type { Tournament } from './rules.ts';

// Each row is one player in one match. A winner carries text, because color alone shows nothing.
export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <table className="bracket">
      <caption>Bracket</caption>
      <thead>
        <tr>
          <th scope="col">Match</th>
          <th scope="col">Player</th>
          <th scope="col">Moves</th>
          <th scope="col">Time</th>
        </tr>
      </thead>
      <tbody>
        {bracketRows(tournament).map((row) => (
          <tr key={row.key}>
            <td>{row.match}</td>
            <td>{row.winner ? `${row.player} (winner)` : row.player}</td>
            <td>{row.moves}</td>
            <td>{row.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
