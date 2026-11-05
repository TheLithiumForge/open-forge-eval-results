import { formatElapsed } from '../elapsed-time.ts';
import type { RoundName, TournamentMatch, TournamentPlayer } from './rules.ts';

interface BracketTableProps {
  matches: readonly TournamentMatch[];
  players: readonly TournamentPlayer[];
}

function playerName(seed: number | null, players: readonly TournamentPlayer[]): string {
  if (seed === null) return 'To be decided';
  return players.find((player) => player.seed === seed)?.name ?? 'Unknown player';
}

function playerCell(
  seed: number | null,
  result: TournamentMatch['results'][number],
  winner: boolean,
  players: readonly TournamentPlayer[],
) {
  const name = playerName(seed, players);
  return (
    <td>
      {winner ? <strong>{name}</strong> : name}
      {result && (
        <small className="tournament-result-line">
          {result.moves} moves · {formatElapsed(result.elapsedMs)}
        </small>
      )}
    </td>
  );
}

export function BracketTable({ matches, players }: BracketTableProps) {
  const matchNumbers: Partial<Record<RoundName, number>> = {};
  return (
    <div className="tournament-table-scroll" tabIndex={0} aria-label="Tournament bracket results">
      <table className="tournament-table">
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Match</th>
            <th scope="col">Player 1</th>
            <th scope="col">Player 2</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const number = (matchNumbers[match.round] ?? 0) + 1;
            matchNumbers[match.round] = number;
            const firstSeed = match.players[0];
            const secondSeed = match.players[1];
            const winner = playerName(match.winnerSeed, players);
            return (
              <tr key={`${match.boardCode}-${match.round}`}>
                <th scope="row">{match.round}</th>
                <td>{number}</td>
                {playerCell(firstSeed, match.results[0], match.winnerSeed === firstSeed, players)}
                {playerCell(secondSeed, match.results[1], match.winnerSeed === secondSeed, players)}
                <td>{match.winnerSeed === null ? '—' : winner}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
