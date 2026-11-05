import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './tournament.ts';
import type { TournamentState } from './tournament.ts';
export function Bracket({ tournament }: { tournament: TournamentState }) {
  return (
    <div className="bracket">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, i) =>
            match.players.map((player, slot) => (
              <tr key={`${i}-${slot}`}>
                <td>
                  {roundName(tournament.names.length, i)} {i + 1}
                </td>
                <td>{player === null ? 'To be decided' : tournament.names[player]}</td>
                <td>{match.scores[slot]?.moves ?? '—'}</td>
                <td>{match.scores[slot] ? formatElapsed(match.scores[slot]!.elapsedMs) : '—'}</td>
                <td>{match.winner === null ? '—' : tournament.names[match.winner]}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
