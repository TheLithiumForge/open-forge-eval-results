import { formatElapsed } from '../elapsed-time.ts';
import { tournamentPlayer } from './results.ts';
import type { TournamentState } from './types.ts';

interface TournamentBracketProps {
  readonly tournament: TournamentState;
  readonly highlightCurrent?: boolean;
}

export function TournamentBracket({
  tournament,
  highlightCurrent = false,
}: TournamentBracketProps) {
  return (
    <div className="tournament-table-viewport">
      <table className="tournament-bracket">
        <caption>Tournament bracket and results</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Players and results</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, index) => (
            <tr
              key={match.boardCode}
              className={
                highlightCurrent && tournament.currentMatchIndex === index ? 'current-match' : ''
              }
            >
              <td>{match.round}</td>
              <td>
                <ol className="tournament-match-players">
                  {match.players.map((seed, slot) => {
                    const player = tournamentPlayer(tournament, seed);
                    const result = match.results[slot];
                    return (
                      <li key={slot}>
                        <span>{player?.name ?? 'To be decided'}</span>
                        <small>
                          {result
                            ? `${result.moves} moves · ${formatElapsed(result.elapsedMs)}`
                            : 'Not played'}
                        </small>
                      </li>
                    );
                  })}
                </ol>
              </td>
              <td>{tournamentPlayer(tournament, match.winnerSeed)?.name ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
