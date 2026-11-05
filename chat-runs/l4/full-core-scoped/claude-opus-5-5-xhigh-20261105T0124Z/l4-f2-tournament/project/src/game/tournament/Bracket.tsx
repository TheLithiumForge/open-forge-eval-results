import { formatElapsed } from '../elapsed-time.ts';
import { matchLabel, matchPlayers, matchWinner } from './rules.ts';
import { BracketLabel, moveCount, TournamentControl } from './tournament-labels.ts';
import type { Tournament } from './rules.ts';
import './tournament.css';

interface BracketProps {
  tournament: Tournament;
}

// One body per match: a row for each player, with the match and its winner spanning both.
export function Bracket({ tournament }: BracketProps) {
  const { players } = tournament;
  // Only a real name breaks anywhere, so placeholders keep their words whole.
  const name = (player: number | null | undefined, missing: string, rows = 1) => {
    const known = player === null || player === undefined ? undefined : players[player];
    return (
      <td rowSpan={rows} className={known ? 'name' : undefined}>
        {known ?? missing}
      </td>
    );
  };
  return (
    <div className="results">
      <table>
        <caption>
          <h3>{TournamentControl.bracket}</h3>
        </caption>
        <thead>
          <tr>
            <th scope="col">{BracketLabel.match}</th>
            <th scope="col">{BracketLabel.player}</th>
            <th scope="col">{BracketLabel.moves}</th>
            <th scope="col">{BracketLabel.time}</th>
            <th scope="col">{BracketLabel.winner}</th>
          </tr>
        </thead>
        {tournament.matches.map((match, index) => (
          <tbody key={match.boardCode}>
            {matchPlayers(tournament, index).map((player, slot) => {
              const result = match.results[slot];
              return (
                <tr key={slot}>
                  {slot === 0 && <td rowSpan={2}>{matchLabel(players.length, index)}</td>}
                  {name(player, BracketLabel.undecidedPlayer)}
                  {result ? (
                    <>
                      <td>{moveCount(result.moves)}</td>
                      <td>{formatElapsed(result.elapsedMs)}</td>
                    </>
                  ) : (
                    <td colSpan={2}>{BracketLabel.notPlayed}</td>
                  )}
                  {slot === 0 &&
                    name(matchWinner(tournament, index), BracketLabel.undecidedWinner, 2)}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
