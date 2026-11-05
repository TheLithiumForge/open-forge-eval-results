import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament } from './tournament.ts';

function resultTime(milliseconds: number): string {
  return `${formatElapsed(milliseconds)}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function Bracket({ tournament }: { tournament: Tournament }) {
  return (
    <section className="tournament-section">
      <h2>Bracket</h2>
      {tournament.rounds.map((round, roundIndex) => (
        <div key={roundIndex}>
          <h3>Round {roundIndex + 1}</h3>
          <div className="bracket">
            {round.map((item, index) => (
              <div className="match" key={index}>
                <h4>Match {index + 1}</h4>
                {item.players.map((player, i) => (
                  <p key={player}>
                    {tournament.names[player]}:{' '}
                    {item.results[i]
                      ? `${item.results[i]!.moves} moves, ${resultTime(item.results[i]!.elapsedMs)}`
                      : 'Awaiting result'}
                  </p>
                ))}
                <p>Winner: {item.winner === null ? 'TBD' : tournament.names[item.winner]}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
