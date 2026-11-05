import { parseBoardCode } from '../deck.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, roundName } from './rules.ts';
import type { Tournament } from './rules.ts';

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <div className="tournament-table" tabIndex={0} role="region" aria-label="Tournament bracket">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            {['Match', 'Round', 'Player', 'Moves', 'Time', 'Winner'].map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tournament.matches.flatMap((match, index) => {
            const winner = matchWinner(tournament, index);
            return matchPlayers(tournament, index).map((player, turn) => {
              const result = match.results[turn];
              return (
                <tr key={`${index}-${turn}`}>
                  <td>{index + 1}</td>
                  <td>{roundName(parseBoardCode(match.boardCode)?.size ?? 8)}</td>
                  <td>{player == null ? 'To be decided' : tournament.players[player]}</td>
                  <td>{result?.moves ?? '—'}</td>
                  <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                  <td>{winner == null ? '—' : tournament.players[winner]}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
