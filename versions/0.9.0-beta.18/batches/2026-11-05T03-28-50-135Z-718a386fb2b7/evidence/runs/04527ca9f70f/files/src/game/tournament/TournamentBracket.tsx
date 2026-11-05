import { formatElapsed } from '../elapsed-time.ts';
import { playerName } from './model.ts';
import type { TournamentMatch, TournamentState } from './model.ts';
import './tournament.css';

interface BracketProps {
  tournament: Pick<TournamentState, 'players' | 'matches' | 'currentMatch'>;
}

export function TournamentBracket({ tournament }: BracketProps) {
  return (
    <section className="tournament-bracket" aria-labelledby="tournament-bracket-heading">
      <h3 id="tournament-bracket-heading">Bracket</h3>
      {tournament.matches.map((match, index) => (
        <MatchTable
          key={`${match.round}-${match.matchNumber}`}
          match={match}
          index={index}
          tournament={tournament}
        />
      ))}
    </section>
  );
}

function MatchTable({
  match,
  index,
  tournament,
}: {
  match: TournamentMatch;
  index: number;
  tournament: BracketProps['tournament'];
}) {
  return (
    <table className="tournament-match">
      <caption>
        {match.round} {match.matchNumber}
        {index === tournament.currentMatch ? ' — Current match' : ''}
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
        {match.playerSeeds.map((seed, turn) => {
          const result = turn === 0 ? match.results[0] : match.results[1];
          const name = playerName(tournament, seed);
          return (
            <tr key={`${match.matchNumber}-${turn}`}>
              <th scope="row">{seed === null ? name : `${seed}. ${name}`}</th>
              <td>{result?.moves ?? '—'}</td>
              <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
              <td>{seed !== null && seed === match.winnerSeed ? 'Winner' : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
