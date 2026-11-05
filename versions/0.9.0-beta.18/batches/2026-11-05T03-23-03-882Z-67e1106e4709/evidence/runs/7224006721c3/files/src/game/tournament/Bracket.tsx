import { formatElapsed } from '../elapsed-time.ts';
import { matchPlayers, matchWinner, tournamentRound } from './rules.ts';
import type { TournamentRecord } from './rules.ts';

export function Bracket({ event }: { event: TournamentRecord }) {
  const name = (seed: number | null | undefined) =>
    seed == null ? 'To be decided' : event.players[seed - 1];
  return (
    <div className="tournament-table" tabIndex={0} role="region" aria-label="Tournament bracket">
      <table>
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            {[
              'Round',
              'Match',
              'Player 1',
              'Moves',
              'Time',
              'Player 2',
              'Moves',
              'Time',
              'Winner',
            ].map((heading, index) => (
              <th key={index} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {event.matches.map((match, index) => {
            const players = matchPlayers(event, index);
            return (
              <tr key={match.boardCode}>
                <td>{tournamentRound(event.players.length, index).name}</td>
                <td>{index + 1}</td>
                {[0, 1].map((turn) => {
                  const result = match.results[turn];
                  return (
                    <TournamentCells
                      key={turn}
                      name={name(players[turn]) ?? ''}
                      moves={result?.moves}
                      elapsedMs={result?.elapsedMs}
                    />
                  );
                })}
                <td>{name(matchWinner(event, index))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TournamentCells({
  name,
  moves,
  elapsedMs,
}: {
  name: string;
  moves: number | undefined;
  elapsedMs: number | undefined;
}) {
  return (
    <>
      <td>{name}</td>
      <td>{moves ?? '—'}</td>
      <td title={elapsedMs === undefined ? undefined : `${elapsedMs} ms`}>
        {elapsedMs === undefined ? '—' : formatElapsed(elapsedMs)}
      </td>
    </>
  );
}
