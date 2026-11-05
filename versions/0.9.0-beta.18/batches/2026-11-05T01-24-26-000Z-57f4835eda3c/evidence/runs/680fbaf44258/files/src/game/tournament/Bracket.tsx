import { formatElapsed } from '../elapsed-time.ts';
import { bracketRounds, feederMatches, matchPlayers, matchWinner } from './bracket.ts';
import {
  feederLabel,
  matchLabel,
  roundName,
  TournamentControl,
  TournamentNotice,
  winnerLine,
} from './tournament-labels.ts';
import type { Tournament } from './bracket.ts';

interface BracketProps {
  tournament: Tournament;
}

export function Bracket({ tournament }: BracketProps) {
  const rounds = bracketRounds(tournament.players.length);
  return (
    <section className="bracket" aria-labelledby="bracket-title">
      <h3 id="bracket-title">{TournamentControl.bracket}</h3>
      <div className="bracket-rounds">
        {rounds.map((matches, round) => (
          <section key={round} className="bracket-round">
            <h4>{roundName(rounds.length - round)}</h4>
            {matches.map((match) => (
              <MatchTable key={match} tournament={tournament} match={match} />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

function MatchTable({ tournament, match }: { tournament: Tournament; match: number }) {
  const players = matchPlayers(tournament, match);
  const results = tournament.matches[match]?.results ?? [null, null];
  const winner = matchWinner(tournament, match);
  const feeders = feederMatches(tournament.players.length, match);
  return (
    <table className="match">
      <caption>{matchLabel(match)}</caption>
      <thead>
        <tr>
          <th scope="col">{TournamentControl.player}</th>
          <th scope="col">{TournamentControl.moves}</th>
          <th scope="col">{TournamentControl.time}</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player, seat) => {
          const result = results[seat];
          return (
            <tr
              key={seat}
              className={player !== null && player === winner ? 'match-winner' : undefined}
            >
              <th scope="row">
                {player === null ? feederLabel(feeders[seat] ?? 0) : tournament.players[player]}
              </th>
              <td>{result ? result.moves : TournamentNotice.unplayed}</td>
              <td>{result ? formatElapsed(result.elapsedMs) : TournamentNotice.unplayed}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>
            {winnerLine(winner === null ? null : (tournament.players[winner] ?? null))}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
