import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament, TournamentPlayer, TournamentResult } from './model.ts';

function playerLabel(
  tournament: Tournament,
  roundIndex: number,
  matchIndex: number,
  slot: 0 | 1,
  player: TournamentPlayer | null,
): string {
  if (player) return player.name;
  if (roundIndex === 0) return '—';
  const feeder = tournament.rounds[roundIndex - 1]?.matches[matchIndex * 2 + slot];
  return feeder ? `Winner of ${feeder.id}` : '—';
}

function resultValue(result: TournamentResult | null, key: 'moves' | 'time'): string | number {
  if (!result) return '—';
  return key === 'moves' ? result.moves : formatElapsed(result.elapsedMs);
}

export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  return (
    <section className="tournament-bracket" aria-labelledby="tournament-bracket-title">
      <h3 id="tournament-bracket-title">Bracket</h3>
      <div className="tournament-table-scroll">
        <table>
          <caption>Tournament bracket</caption>
          <thead>
            <tr>
              <th scope="col">Round</th>
              <th scope="col">Match</th>
              <th scope="col">Board code</th>
              <th scope="col">Player</th>
              <th scope="col">Moves</th>
              <th scope="col">Time</th>
              <th scope="col">Winner</th>
            </tr>
          </thead>
          {tournament.rounds.map((round, roundIndex) =>
            round.matches.map((match, matchIndex) => {
              const rows = [
                { player: match.players[0], result: match.results[0], slot: 0 as const },
                { player: match.players[1], result: match.results[1], slot: 1 as const },
              ];
              return (
                <tbody key={`${round.name}-${match.id}`}>
                  {rows.map(({ player, result, slot }) => (
                    <tr key={slot}>
                      <td>{round.name}</td>
                      <td>{match.id}</td>
                      <td>{match.boardCode}</td>
                      <td>{playerLabel(tournament, roundIndex, matchIndex, slot, player)}</td>
                      <td>{resultValue(result, 'moves')}</td>
                      <td>{resultValue(result, 'time')}</td>
                      <td>{match.winner?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              );
            }),
          )}
        </table>
      </div>
    </section>
  );
}
