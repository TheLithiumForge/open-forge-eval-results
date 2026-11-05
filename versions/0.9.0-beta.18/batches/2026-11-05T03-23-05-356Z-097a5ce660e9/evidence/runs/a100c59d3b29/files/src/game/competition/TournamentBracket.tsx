import { formatElapsed } from '../elapsed-time.ts';
import type { PastTournament, TournamentMatch, TournamentPlayer } from './types.ts';

interface TournamentBracketProps {
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
}

export function TournamentBracket({ players, matches }: TournamentBracketProps) {
  return (
    <section className="tournament-bracket" aria-label="Tournament bracket">
      <h3>Tournament bracket</h3>
      <div className="tournament-match-list">
        {matches.map((match) => (
          <MatchTable key={match.id} match={match} players={players} />
        ))}
      </div>
    </section>
  );
}

export function PastBracket({ tournament }: { readonly tournament: PastTournament }) {
  return <TournamentBracket players={tournament.players} matches={tournament.matches} />;
}

function MatchTable({
  match,
  players,
}: {
  readonly match: TournamentMatch;
  readonly players: readonly TournamentPlayer[];
}) {
  return (
    <div className="tournament-match-table-wrap">
      <table className="tournament-match-table">
        <caption>
          {match.round} — Match {match.number}
        </caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {match.players.map((seed, index) => {
            const player = players.find((candidate) => candidate.seed === seed);
            const result = match.results[index];
            return (
              <tr key={index}>
                <th scope="row">{player?.name ?? 'To be determined'}</th>
                <td>{result?.moves ?? '—'}</td>
                <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
                <td>{seed !== null && match.winnerSeed === seed ? 'Winner' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="tournament-deal-code">Deal: {match.boardCode}</p>
    </div>
  );
}
