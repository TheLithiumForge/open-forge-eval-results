import { formatElapsed } from '../elapsed-time.ts';
import { tournamentBracket } from './tournament.ts';
import type { Tournament } from './tournament.ts';

export function Bracket({ tournament }: { tournament: Tournament }) {
  const matches = tournamentBracket(tournament);
  const rounds = Math.log2(tournament.players.length);
  return (
    <section className="tournament-bracket" aria-label="Bracket">
      <h3>Bracket</h3>
      <div className="tournament-rounds">
        {Array.from({ length: rounds }, (_, round) => (
          <section key={round} className="tournament-round">
            <h4>{['Final', 'Semifinals', 'Quarterfinals'][rounds - round - 1]}</h4>
            {matches.map((match, index) =>
              match.round !== round ? null : (
                <article className="tournament-match" key={index} aria-label={`Match ${index + 1}`}>
                  <h5>Match {index + 1}</h5>
                  <table aria-label={`Match ${index + 1} results`}>
                    <thead>
                      <tr>
                        <th scope="col">Player</th>
                        <th scope="col">Moves</th>
                        <th scope="col">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.players.map((player, slot) => {
                        const result = match.results[slot];
                        const name =
                          player === null
                            ? `Winner of match ${(index - tournament.players.length / 2) * 2 + slot + 1}`
                            : tournament.players[player];
                        return (
                          <tr
                            key={slot}
                            className={
                              player !== null && match.winner === player ? 'tournament-winner' : ''
                            }
                          >
                            <th scope="row">{name}</th>
                            <td>{result ? result.moves : '—'}</td>
                            <td>
                              {result
                                ? `${formatElapsed(result.elapsedMs)}.${String(result.elapsedMs % 1000).padStart(3, '0')}`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p>
                    Winner: {match.winner === null ? 'Pending' : tournament.players[match.winner]}
                  </p>
                </article>
              ),
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
