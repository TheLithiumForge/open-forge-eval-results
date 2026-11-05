import { formatElapsed } from '../elapsed-time.ts';
import { tournamentBracket } from './bracket.ts';
import type { TournamentRecord } from './tournament.ts';

interface TournamentBracketProps {
  tournament: TournamentRecord;
  currentMatch: number;
}

export function TournamentBracket({ tournament, currentMatch }: TournamentBracketProps) {
  const bracket = tournamentBracket(tournament);
  const rounds = [...new Set(bracket.map((match) => match.round))];
  return (
    <section className="tournament-bracket" aria-labelledby="bracket-title">
      <h3 id="bracket-title">Bracket</h3>
      <div className="bracket-rounds">
        {rounds.map((round) => (
          <section className="bracket-round" key={round}>
            <h4>
              {round === rounds.length - 1
                ? 'Final'
                : round === rounds.length - 2
                  ? 'Semifinals'
                  : 'Quarterfinals'}
            </h4>
            {bracket
              .filter((match) => match.round === round)
              .map((match) => {
                const results = tournament.matches[match.index]?.results ?? [];
                return (
                  <article
                    className="bracket-match"
                    key={match.index}
                    aria-label={`Match ${match.index + 1}`}
                    aria-current={currentMatch === match.index ? 'step' : undefined}
                  >
                    <h5>Match {match.index + 1}</h5>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Player</th>
                          <th scope="col">Moves</th>
                          <th scope="col">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.players.map((player, turn) => (
                          <tr key={turn}>
                            <th scope="row">
                              {player === null
                                ? `Winner of match ${(match.sources[turn] ?? 0) + 1}`
                                : tournament.players[player]}
                            </th>
                            <td>{results[turn]?.moves ?? '—'}</td>
                            <td>{results[turn] ? formatElapsed(results[turn].elapsedMs) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p>
                      {match.winner !== null
                        ? `Winner: ${tournament.players[match.winner]}`
                        : results.length === 2
                          ? 'Tie. Replay this match on a new deal.'
                          : 'Winner: Pending'}
                    </p>
                  </article>
                );
              })}
          </section>
        ))}
      </div>
    </section>
  );
}
