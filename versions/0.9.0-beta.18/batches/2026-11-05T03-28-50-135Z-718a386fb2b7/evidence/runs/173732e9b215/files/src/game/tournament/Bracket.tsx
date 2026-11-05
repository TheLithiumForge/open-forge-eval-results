import { formatElapsed } from '../elapsed-time.ts';
import type { Score, TournamentData } from './tournament.ts';

function formatScore(score: Score): string {
  return `${score.moves} moves, ${formatElapsed(score.elapsedMs)}.${String(score.elapsedMs % 1000).padStart(3, '0')}`;
}

export function Bracket({ data }: { data: TournamentData }) {
  return (
    <section>
      <h2>Bracket</h2>
      <div className="bracket">
        {data.rounds.map((round, r) => (
          <div className="bracket-round" key={r}>
            <h3>{r === data.rounds.length - 1 ? 'Final' : `Round ${r + 1}`}</h3>
            {round.map((item, m) => (
              <div className="bracket-match" key={m}>
                <h4>Match {m + 1}</h4>
                {item.players.map((player, p) => (
                  <p key={p}>
                    {player === null ? 'To be decided' : data.names[player]}:{' '}
                    {item.scores[p] ? formatScore(item.scores[p]) : '—'}
                  </p>
                ))}
                <p>Winner: {item.winner === null ? '—' : data.names[item.winner]}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
