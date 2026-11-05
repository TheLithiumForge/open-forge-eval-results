import { formatElapsed } from '../elapsed-time.ts';
import type { TournamentMatch, TournamentState } from './tournament.ts';

interface TournamentBracketProps {
  tournament: TournamentState;
}

function Match({
  match,
  tournament,
  index,
}: {
  match: TournamentMatch;
  tournament: TournamentState;
  index: number;
}) {
  return (
    <article
      className="tournament-match"
      aria-label={`Match ${index + 1}`}
      aria-current={index === tournament.currentMatch ? 'step' : undefined}
    >
      <h4>Match {index + 1}</h4>
      <ul>
        {match.players.map((player, slot) => {
          const score = match.results[slot];
          const time = score
            ? `${formatElapsed(score.elapsedMs)}.${String(score.elapsedMs % 1000).padStart(3, '0')}`
            : '';
          return (
            <li key={slot}>
              <span>{player === null ? 'To be decided' : tournament.players[player]}</span>
              <span className="tournament-score">
                {score ? `${score.moves} moves · ${time}` : 'Moves: — · Time: —'}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={match.winner === null ? 'help' : 'tournament-winner'}>
        Winner: {match.winner === null ? 'To be decided' : tournament.players[match.winner]}
      </p>
    </article>
  );
}

export function TournamentBracket({ tournament }: TournamentBracketProps) {
  const rounds: { name: string; start: number; matches: readonly TournamentMatch[] }[] = [];
  let start = 0;
  for (let width = tournament.players.length / 2; width >= 1; width /= 2) {
    rounds.push({
      name: width === 1 ? 'Final' : width === 2 ? 'Semifinals' : 'Quarterfinals',
      start,
      matches: tournament.matches.slice(start, start + width),
    });
    start += width;
  }
  return (
    <section className="tournament-bracket" aria-labelledby="bracket-heading">
      <h2 id="bracket-heading">Bracket</h2>
      <div className="tournament-rounds">
        {rounds.map((round) => (
          <section key={round.name} aria-label={round.name}>
            <h3>{round.name}</h3>
            {round.matches.map((match, index) => (
              <Match
                key={index}
                match={match}
                tournament={tournament}
                index={round.start + index}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
