import { formatElapsed } from '../elapsed-time.ts';
import { roundName } from './rules.ts';
import type { Tournament } from './rules.ts';

export function Bracket({ tournament }: { tournament: Tournament }) {
  const { matches, names } = tournament;
  return (
    <div className="bracket-scroll">
      <table>
        <caption>Bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <tr key={match.code}>
              <td>{roundName(names.length, index)}</td>
              {[0, 1].map((slot) => {
                const player = match.players[slot];
                const result = match.results[slot];
                return [
                  <td key={`${slot}-player`}>
                    {player == null ? 'To be decided' : names[player]}
                  </td>,
                  <td key={`${slot}-moves`}>{result?.moves ?? '—'}</td>,
                  <td key={`${slot}-time`}>{result ? formatElapsed(result.elapsedMs) : '—'}</td>,
                ];
              })}
              <td>{match.winner === null ? '—' : names[match.winner]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
