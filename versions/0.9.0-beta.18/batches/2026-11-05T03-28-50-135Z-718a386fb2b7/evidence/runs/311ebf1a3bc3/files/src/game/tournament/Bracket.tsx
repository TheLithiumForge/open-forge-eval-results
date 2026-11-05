import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './rules.ts';
import type { TournamentData, Score } from './rules.ts';

function score(value: Score | null): string {
  return value ? `${value.moves} moves, ${formatElapsed(value.elapsedMs)}` : '—';
}
export function Bracket({ tournament }: { tournament: TournamentData }) {
  const name = (player: number | null) => (player === null ? 'TBD' : tournament.players[player]);
  return (
    <div className="bracket-scroll">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Player 1</th>
            <th scope="col">Result</th>
            <th scope="col">Player 2</th>
            <th scope="col">Result</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, index) => (
            <tr key={match.boardCode}>
              <td>{roundName(tournament.players.length, index)}</td>
              <td>{name(match.players[0])}</td>
              <td>{score(match.scores[0])}</td>
              <td>{name(match.players[1])}</td>
              <td>{score(match.scores[1])}</td>
              <td>{match.winner === null ? '—' : name(match.winner)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
