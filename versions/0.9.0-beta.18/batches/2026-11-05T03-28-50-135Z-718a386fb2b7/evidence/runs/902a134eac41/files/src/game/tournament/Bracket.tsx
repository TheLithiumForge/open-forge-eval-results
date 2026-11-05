import { formatElapsed } from '../elapsed-time.ts';
import type { TournamentPlayer, TournamentResult, TournamentRound } from './model.ts';
import './tournament.css';

interface BracketProps {
  players: readonly TournamentPlayer[];
  rounds: readonly TournamentRound[];
}

function displayResult(
  seed: number | null,
  result: TournamentResult | null,
  players: readonly TournamentPlayer[],
): string {
  if (seed === null) return 'TBD';
  const player = players.find((candidate) => candidate.seed === seed);
  if (!player) return 'TBD';
  const score = result
    ? `${result.moves} moves · ${formatElapsed(result.elapsedMs)}`
    : 'Not played';
  return `${player.name} — ${score}`;
}

function playerName(seed: number | null, players: readonly TournamentPlayer[]): string {
  return players.find((player) => player.seed === seed)?.name ?? 'Pending';
}

export function Bracket({ players, rounds }: BracketProps) {
  return (
    <div className="tournament-bracket">
      {rounds.map((round) => (
        <section
          className="tournament-round"
          key={round.name}
          aria-labelledby={`round-${round.name}`}
        >
          <h3 id={`round-${round.name}`}>Round: {round.name}</h3>
          <div className="tournament-table-scroll">
            <table>
              <caption>{round.name} matches</caption>
              <thead>
                <tr>
                  <th scope="col">Match</th>
                  <th scope="col">Player 1</th>
                  <th scope="col">Player 2</th>
                  <th scope="col">Winner</th>
                </tr>
              </thead>
              <tbody>
                {round.matches.map((match, index) => (
                  <tr key={match.boardCode}>
                    <th scope="row">
                      Match {index + 1}
                      <span className="tournament-code">{match.boardCode}</span>
                    </th>
                    <td>{displayResult(match.players[0], match.results[0], players)}</td>
                    <td>{displayResult(match.players[1], match.results[1], players)}</td>
                    <td>{playerName(match.winnerSeed, players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
