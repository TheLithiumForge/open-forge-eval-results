import { formatElapsed } from '../elapsed-time.ts';
import { nameOf, roundOf, seedsOf, winnerOf } from './rules.ts';
import { BracketColumn } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

const UNDECIDED = 'To be decided';
const MISSING = '-';

// One row for each player in each match, so every value sits under its column header.
export function Bracket({ tournament }: { tournament: Tournament }) {
  const count = tournament.players.length;
  return (
    <div className="table-scroll" role="region" aria-label="Bracket results" tabIndex={0}>
      <table className="results">
        <caption>Bracket</caption>
        <thead>
          <tr>
            {BracketColumn.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournament.matches.flatMap((match, index) => {
            const seeds = seedsOf(tournament, index);
            const winner = winnerOf(tournament, index);
            return [0, 1].map((seat) => {
              const seed = seeds?.[seat] ?? null;
              const result = match.results[seat];
              const outcome =
                winner === null || seed === null
                  ? MISSING
                  : seed === winner
                    ? 'Winner'
                    : 'Eliminated';
              return (
                <tr key={`${index}-${seat}`}>
                  <td>{roundOf(count, index)}</td>
                  <td>{index + 1}</td>
                  <th scope="row">{seed === null ? UNDECIDED : nameOf(tournament, seed)}</th>
                  <td>{result ? result.moves : MISSING}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : MISSING}</td>
                  <td>{outcome}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
