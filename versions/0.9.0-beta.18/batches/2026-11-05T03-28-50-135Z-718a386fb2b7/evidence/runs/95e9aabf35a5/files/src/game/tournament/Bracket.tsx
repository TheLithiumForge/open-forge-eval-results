import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament } from './tournament.ts';

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bracket" aria-label="Tournament bracket">
      {tournament.rounds.map((round, roundIndex) => (
        <section key={roundIndex}>
          <h3>{round.length === 1 ? 'Final' : `Round ${roundIndex + 1}`}</h3>
          {round.map((match, matchIndex) => (
            <div className="match" key={matchIndex}>
              <h4>Match {matchIndex + 1}</h4>
              {match.players.map((player, playerIndex) => {
                const result = match.results[playerIndex];
                return (
                  <p key={playerIndex}>
                    {player === null ? 'To be decided' : tournament.names[player]}:{' '}
                    {result ? `${result.moves} moves, ${formatElapsed(result.elapsedMs)}` : '—'}
                  </p>
                );
              })}
              <p>Winner: {match.winner === null ? '—' : tournament.names[match.winner]}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
