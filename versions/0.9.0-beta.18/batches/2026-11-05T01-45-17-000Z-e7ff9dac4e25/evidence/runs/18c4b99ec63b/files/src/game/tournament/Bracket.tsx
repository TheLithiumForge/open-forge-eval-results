import { formatElapsed } from '../elapsed-time.ts';
import { TournamentText, winnerLine } from './tournament-labels.ts';
import { matchPlayers, matchTitle, matchWinner, roundMatches, roundName } from './tournament.ts';
import type { Tournament } from './tournament.ts';
import './bracket.css';

interface BracketProps {
  tournament: Tournament;
  current: number | null;
}

interface MatchCardProps {
  tournament: Tournament;
  match: number;
  active: boolean;
}

function MatchCard({ tournament, match, active }: MatchCardProps) {
  const turns = tournament.matches[match]?.turns ?? [];
  const winner = matchWinner(tournament, match);
  return (
    <li className="match" aria-current={active ? 'step' : undefined}>
      <table>
        <caption>{matchTitle(tournament.players.length, match)}</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {matchPlayers(tournament, match).map((player, slot) => {
            const turn = turns[slot];
            return (
              <tr key={slot}>
                <th scope="row">{player ?? TournamentText.undecided}</th>
                <td>{turn ? turn.moves : '-'}</td>
                <td>{turn ? formatElapsed(turn.elapsedMs) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="winner">{winnerLine(winner)}</p>
    </li>
  );
}

// Every match with its players, their moves and time, and its winner. Later rounds wait for
// the winners before them.
export function Bracket({ tournament, current }: BracketProps) {
  const count = tournament.players.length;
  return (
    <section aria-labelledby="bracket-heading">
      <h3 id="bracket-heading">{TournamentText.bracket}</h3>
      {roundMatches(count).map((matches, round) => (
        <div className="round" key={round}>
          <h4>
            {roundName(count, round)}
            {matches.length > 1 ? 's' : ''}
          </h4>
          <ol className="matches">
            {matches.map((match) => (
              <MatchCard
                key={match}
                tournament={tournament}
                match={match}
                active={match === current}
              />
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
