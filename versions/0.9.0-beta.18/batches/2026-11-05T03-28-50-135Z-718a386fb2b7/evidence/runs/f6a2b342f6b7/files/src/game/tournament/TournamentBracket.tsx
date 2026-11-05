import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament, TournamentPlayer } from './types.ts';
import type { TournamentMatch, TournamentResult } from './pairing.ts';

interface TournamentBracketProps {
  tournament: Tournament;
}

export function TournamentBracket({ tournament }: TournamentBracketProps) {
  return (
    <div className="tournament-table-wrap">
      <table className="tournament-table">
        <caption>Tournament bracket</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Match</th>
            <th scope="col">Deal</th>
            <th scope="col">Players</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, index) => (
            <BracketRow
              key={match.boardCode}
              match={match}
              number={roundMatchNumber(tournament.matches, index)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BracketRowProps {
  match: TournamentMatch;
  number: number;
}

function BracketRow({ match, number }: BracketRowProps) {
  const [first, second] = match.players;
  const [firstResult, secondResult] = match.results;
  return (
    <tr>
      <td>{match.round}</td>
      <td>{number}</td>
      <td>{match.boardCode}</td>
      <td>
        <PlayerValue player={first} />
        <PlayerValue player={second} />
      </td>
      <td>
        <ResultValue player={first} result={firstResult} field="moves" />
        <ResultValue player={second} result={secondResult} field="moves" />
      </td>
      <td>
        <ResultValue player={first} result={firstResult} field="time" />
        <ResultValue player={second} result={secondResult} field="time" />
      </td>
      <td>{match.winner ? `${match.winner.seed}. ${match.winner.name}` : '—'}</td>
    </tr>
  );
}

function PlayerValue({ player }: { player: TournamentPlayer | null }) {
  return <div>{player ? `${player.seed}. ${player.name}` : 'To be determined'}</div>;
}

function ResultValue({
  player,
  result,
  field,
}: {
  player: TournamentPlayer | null;
  result: TournamentResult | null;
  field: 'moves' | 'time';
}) {
  if (!player) return <div>—</div>;
  if (!result) return <div>{player.name}: —</div>;
  const value = field === 'moves' ? `${result.moves} moves` : formatElapsed(result.elapsedMs);
  return (
    <div>
      {player.name}: {value}
    </div>
  );
}

function roundMatchNumber(matches: readonly TournamentMatch[], index: number): number {
  const match = matches[index];
  if (!match) return index + 1;
  return matches.slice(0, index).filter((entry) => entry.round === match.round).length + 1;
}
