import { formatElapsed } from '../elapsed-time.ts';
import { matchLabel, matchPlayers, winnerOf } from './rules.ts';
import { TournamentText } from './tournament-labels.ts';
import type { Tournament } from './types.ts';
import './tournament.css';

interface BracketProps {
  tournament: Tournament;
}

const SIDES = [0, 1] as const;

// One row per player, two per match, so every column keeps its meaning down the table.
export function Bracket({ tournament }: BracketProps) {
  const count = tournament.players.length;
  return (
    <div className="table-scroll" role="region" aria-labelledby="bracket-title" tabIndex={0}>
      <table className="results bracket">
        <caption id="bracket-title">{TournamentText.bracket}</caption>
        <thead>
          <tr>
            <th scope="col">Match</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Board code</th>
          </tr>
        </thead>
        {tournament.matches.map((match, index) => {
          const players = matchPlayers(tournament, index);
          const winner = winnerOf(tournament, index);
          return (
            <tbody key={match.boardCode}>
              {SIDES.map((side) => {
                const player = players[side];
                const result = match.results[side];
                const name =
                  player === undefined
                    ? TournamentText.undecided
                    : `${tournament.players[player] ?? ''}${player === winner ? TournamentText.winner : ''}`;
                return (
                  <tr key={side}>
                    {side === 0 && <td rowSpan={2}>{matchLabel(count, index)}</td>}
                    <td className="name">{name}</td>
                    <td>{result ? result.moves : TournamentText.pending}</td>
                    <td>{result ? formatElapsed(result.elapsedMs) : TournamentText.pending}</td>
                    {side === 0 && <td rowSpan={2}>{match.boardCode}</td>}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
