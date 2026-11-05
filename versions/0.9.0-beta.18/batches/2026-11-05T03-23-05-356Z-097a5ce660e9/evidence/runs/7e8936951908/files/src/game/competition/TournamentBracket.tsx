import { formatElapsed } from '../elapsed-time.ts';
import { tournamentPlayer } from './tournament.ts';
import type { Tournament, TournamentMatch } from './tournament.ts';

interface TournamentBracketProps {
  readonly tournament: Tournament;
}

export function TournamentBracket({ tournament }: TournamentBracketProps) {
  const rounds = Array.from(new Set(tournament.matches.map((match) => match.round)));
  return (
    <div className="tournament-bracket">
      {rounds.map((round) => {
        const matches = tournament.matches.filter((match) => match.round === round);
        const stage = matches[0]?.stage;
        if (!stage) return null;
        return (
          <section key={round}>
            <h3>Round: {stage}</h3>
            <div className="tournament-table">
              <table>
                <caption>{stage} matches</caption>
                <thead>
                  <tr>
                    <th scope="col">Match</th>
                    <th scope="col">Player</th>
                    <th scope="col">Moves</th>
                    <th scope="col">Time</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                {matches.map((match, index) => (
                  <tbody key={`${round}-${index + 1}`}>
                    {matchRows(tournament, match, index + 1)}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function matchRows(tournament: Tournament, match: TournamentMatch, number: number) {
  return match.players.map((seed, index) => {
    const player = tournamentPlayer(tournament, seed);
    const result = match.results[index];
    return (
      <tr key={`${match.round}-${number}-${index}`}>
        {index === 0 && (
          <th scope="rowgroup" rowSpan={2}>
            Match {number}
          </th>
        )}
        <td>{player?.name ?? 'To be determined'}</td>
        <td>{result?.moves ?? '—'}</td>
        <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
        <td>{result && match.winner === result.seed ? 'Winner' : '—'}</td>
      </tr>
    );
  });
}
