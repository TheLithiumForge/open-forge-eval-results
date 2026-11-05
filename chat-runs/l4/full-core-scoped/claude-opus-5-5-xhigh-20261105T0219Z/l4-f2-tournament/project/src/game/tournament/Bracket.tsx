import { formatElapsed } from '../elapsed-time.ts';
import { movesText, TournamentColumn, TournamentText } from './labels.ts';
import { matchLabel, matchPlayers, matchWinner } from './rules.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

const COLUMNS = [
  TournamentColumn.match,
  TournamentColumn.player,
  TournamentColumn.moves,
  TournamentColumn.time,
  TournamentColumn.winner,
];
const SLOTS = [0, 1] as const;

// One row group per match: its two players in play order, their results and its winner.
export function Bracket({ tournament }: { tournament: Tournament }) {
  const { players, matches } = tournament;
  const name = (entry: number | null | undefined) =>
    (entry === null || entry === undefined ? undefined : players[entry]) ??
    TournamentText.undecided;
  return (
    <div className="table-scroll">
      <table className="results">
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
        {matches.map((match, index) => {
          const entries = matchPlayers(tournament, index);
          return (
            <tbody key={match.boardCode}>
              {SLOTS.map((slot) => {
                const result = match.results[slot];
                return (
                  <tr key={slot}>
                    {slot === 0 && <td rowSpan={2}>{matchLabel(players.length, index)}</td>}
                    <td>{name(entries[slot])}</td>
                    <td>{result ? movesText(result.moves) : TournamentText.notPlayed}</td>
                    <td>{result ? formatElapsed(result.elapsedMs) : TournamentText.notPlayed}</td>
                    {slot === 0 && <td rowSpan={2}>{name(matchWinner(tournament, index))}</td>}
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
