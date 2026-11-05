import { formatElapsed } from '../elapsed-time.ts';
import { matchRound } from './bracket.ts';
import { matchSeeds, matchWinner, playerName } from './rules.ts';
import { movesText, TournamentColumn, TournamentText } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

const COLUMNS = [
  TournamentColumn.round,
  TournamentColumn.player,
  TournamentColumn.moves,
  TournamentColumn.time,
  TournamentColumn.winner,
];
const SEATS = [0, 1];

// One row group per match, in bracket order. Each player row has that player's moves and time.
export function Bracket({ tournament }: { tournament: Tournament }) {
  const count = tournament.players.length;
  return (
    <div className="tournament-table">
      <table>
        <caption>{TournamentText.bracket}</caption>
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
          const seeds = matchSeeds(tournament, index);
          const winner = matchWinner(tournament, index);
          return (
            <tbody key={match.boardCode}>
              {SEATS.map((seat) => {
                const seed = seeds?.[seat];
                const result = match.results[seat];
                return (
                  <tr key={seat}>
                    {seat === 0 && <td rowSpan={2}>{matchRound(count, index)}</td>}
                    <td>
                      {seed === undefined ? TournamentText.undecided : playerName(tournament, seed)}
                    </td>
                    <td>{result ? movesText(result.moves) : TournamentText.unplayed}</td>
                    <td>{result ? formatElapsed(result.elapsedMs) : TournamentText.unplayed}</td>
                    {seat === 0 && (
                      <td rowSpan={2}>
                        {winner === null ? TournamentText.unplayed : playerName(tournament, winner)}
                      </td>
                    )}
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
