import { formatElapsed } from '../elapsed-time.ts';
import { matchWinner, roundNames } from './rules.ts';
import { TournamentText } from './tournament-labels.ts';
import type { RoundName, Tournament } from './rules.ts';
import './tournament.css';

interface Row {
  readonly match: string;
  readonly player: string;
  readonly moves: string;
  readonly time: string;
}

function matchName(round: RoundName, index: number, matches: number): string {
  return matches === 1 ? round : `${round} ${index + 1}`;
}

// One row for each player of each match, with the rounds still to come named by their feeders.
function bracketRows(tournament: Tournament): readonly Row[] {
  const rounds = roundNames(tournament.players.length);
  return rounds.flatMap((round, roundIndex) => {
    const count = tournament.players.length / 2 ** (roundIndex + 1);
    const previous = rounds[roundIndex - 1];
    return Array.from({ length: count }, (_, index) => {
      const name = matchName(round, index, count);
      const match = tournament.rounds[roundIndex]?.[index];
      if (!match)
        return [0, 1].map((side) => ({
          match: name,
          player: previous ? `Winner of ${matchName(previous, index * 2 + side, count * 2)}` : '',
          moves: '',
          time: '',
        }));
      const winner = matchWinner(match);
      return match.players.map((player, side) => {
        const attempt = match.results[side];
        const label = tournament.players[player] ?? '';
        return {
          match: name,
          player: player === winner ? `${label} ${TournamentText.winner}` : label,
          moves: attempt ? String(attempt.moves) : '',
          time: attempt ? formatElapsed(attempt.elapsedMs) : '',
        };
      });
    }).flat();
  });
}

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bracket">
      <table>
        <caption>{TournamentText.bracket}</caption>
        <thead>
          <tr>
            <th scope="col">Match</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {bracketRows(tournament).map((row, index) => (
            <tr key={index}>
              <td>{row.match}</td>
              <td>{row.player}</td>
              <td>{row.moves}</td>
              <td>{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
