import { formatElapsed } from '../elapsed-time.ts';
import { matchFeeders, matchLabel, matchSeeds, matchWinner, playerName } from './rules.ts';
import { TournamentTable } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';

const COLUMNS = [
  TournamentTable.seed,
  TournamentTable.player,
  TournamentTable.moves,
  TournamentTable.time,
];

function moveCount(moves: number): string {
  return `${moves} ${moves === 1 ? 'move' : 'moves'}`;
}

// Each match opens with its name, then one row for each of its players. A winner is marked in
// words, not by color alone.
export function Bracket({ tournament }: { tournament: Tournament }) {
  const count = tournament.players.length;
  return (
    <table className="tournament-table">
      <caption>{TournamentTable.bracket}</caption>
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      {tournament.matches.map((match, index) => {
        const label = matchLabel(count, index);
        const winner = matchWinner(tournament, index);
        const feeders = matchFeeders(count, index);
        return (
          <tbody key={index}>
            <tr className="match-name">
              <td colSpan={COLUMNS.length}>{label}</td>
            </tr>
            {matchSeeds(tournament, index).map((seed, side) => {
              const attempt = match.attempts[side];
              const feeder = feeders[side] ?? null;
              const player =
                seed === null
                  ? `Winner of ${feeder === null ? '' : matchLabel(count, feeder)}`
                  : `${playerName(tournament, seed)}${seed === winner ? ' (winner)' : ''}`;
              return (
                <tr key={side}>
                  <td>{seed}</td>
                  <td className="player-cell">{player}</td>
                  <td>{attempt ? moveCount(attempt.moves) : TournamentTable.notPlayed}</td>
                  <td>{attempt ? formatElapsed(attempt.elapsedMs) : TournamentTable.notPlayed}</td>
                </tr>
              );
            })}
          </tbody>
        );
      })}
    </table>
  );
}
