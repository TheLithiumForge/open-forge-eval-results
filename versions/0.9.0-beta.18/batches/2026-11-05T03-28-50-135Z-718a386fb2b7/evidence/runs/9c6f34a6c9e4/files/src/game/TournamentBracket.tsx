import { formatElapsed } from './elapsed-time.ts';
import { resultForGame } from './tournament.ts';
import type { GameState } from './game.ts';
import type { Tournament, TournamentMatch } from './tournament.ts';

interface TournamentBracketProps {
  tournament: Tournament;
  game?: GameState;
}

export function TournamentBracket({ tournament, game }: TournamentBracketProps) {
  return (
    <section className="tournament-bracket" aria-label="Tournament bracket">
      <h2>Bracket</h2>
      <div className="bracket-rounds">
        {tournament.rounds.map((round, roundIndex) => (
          <section className="bracket-round" key={roundIndex}>
            <h3>{roundName(roundIndex, tournament.rounds.length)}</h3>
            <ol>
              {round.map((match, matchIndex) => (
                <MatchCard
                  key={`${roundIndex}-${matchIndex}`}
                  tournament={tournament}
                  match={match}
                  roundIndex={roundIndex}
                  matchIndex={matchIndex}
                  game={game}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

interface MatchCardProps extends Omit<TournamentBracketProps, 'game'> {
  game: GameState | undefined;
  match: TournamentMatch;
  roundIndex: number;
  matchIndex: number;
}

function MatchCard({ tournament, match, roundIndex, matchIndex, game }: MatchCardProps) {
  const current =
    tournament.status === 'active' &&
    tournament.currentRound === roundIndex &&
    tournament.currentMatch === matchIndex;
  return (
    <li className={`bracket-match${current ? ' current-match' : ''}`}>
      <h4>Match {matchIndex + 1}</h4>
      <ul>
        {match.players.map((playerId, slot) => {
          const name = playerId === null ? 'TBD' : (tournament.players[playerId]?.name ?? 'TBD');
          const live = current && tournament.turn === slot && game?.started && !match.results[slot];
          const result = match.results[slot] ?? (live && game ? resultForGame(game) : null);
          const winner = match.winnerId === playerId && playerId !== null;
          return (
            <li key={slot} className={winner ? 'match-winner' : undefined}>
              <span>{name}</span>
              <span className="match-score">
                {result ? `${result.moves} moves · ${formatElapsed(result.elapsedMs)}` : '—'}
                {winner ? ' · Winner' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function roundName(index: number, roundCount: number): string {
  const roundsFromFinal = roundCount - index;
  if (roundsFromFinal === 1) return 'Final';
  if (roundsFromFinal === 2) return 'Semi-finals';
  return 'Quarter-finals';
}
