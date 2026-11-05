import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { championSeed, currentMatch, currentPlayer } from './bracket.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentStatus } from './TournamentStatus.tsx';
import type { TournamentState } from './model.ts';
import './tournament.css';

interface TournamentPlayProps {
  tournament: TournamentState;
  activate(index: number): void;
  startTurn(): void;
  nextTurn(): void;
  nextMatch(): void;
  back(): void;
  leave(): void;
}

export function TournamentPlay({
  tournament,
  activate,
  startTurn,
  nextTurn,
  nextMatch,
  back,
  leave,
}: TournamentPlayProps) {
  const board = useRef<BoardFocus>(null);
  const roundHeading = useRef<HTMLHeadingElement>(null);
  const championHeading = useRef<HTMLHeadingElement>(null);
  const hasGame = Boolean(tournament.currentGame);
  const previousHasGame = useRef(hasGame);
  const match = currentMatch(tournament);
  const player = currentPlayer(tournament);
  const champion = championSeed(tournament);

  useEffect(() => {
    if (hasGame && !previousHasGame.current) board.current?.focusRemembered();
    previousHasGame.current = hasGame;
  }, [hasGame]);
  useEffect(() => {
    if (tournament.status === 'complete') championHeading.current?.focus();
    else roundHeading.current?.focus();
  }, [tournament.status]);

  const action =
    tournament.status === 'complete'
      ? { label: 'Back to game', run: back }
      : match.results[0] && !match.results[1]
        ? tournament.currentTurn === 0
          ? { label: 'Next turn', run: nextTurn }
          : { label: 'Start turn', run: startTurn }
        : match.winnerSeed !== null
          ? { label: 'Next match', run: nextMatch }
          : !tournament.currentGame
            ? { label: 'Start turn', run: startTurn }
            : null;

  return (
    <section className="tournament-play" aria-labelledby="tournament-round-title">
      {tournament.status === 'complete' ? (
        <>
          <h3 id="tournament-round-title" ref={championHeading} className="champion" tabIndex={-1}>
            Champion: {tournament.players.find((entry) => entry.seed === champion)?.name}
          </h3>
          <TournamentBracket record={tournament} />
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          <h3 id="tournament-round-title" ref={roundHeading} tabIndex={-1}>
            Round: {tournament.rounds[tournament.currentRound]?.name}
          </h3>
          <p className="tournament-match-label">
            Match {tournament.currentMatch + 1} of{' '}
            {tournament.rounds[tournament.currentRound]?.matches.length}
          </p>
          <p className="now-playing">Now playing: {player?.name}</p>
          {tournament.currentGame && (
            <>
              <TournamentStatus game={tournament.currentGame} />
              <p id="tournament-board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              <Board
                key={`${tournament.currentRound}-${tournament.currentMatch}-${tournament.currentTurn}`}
                game={tournament.currentGame}
                activate={activate}
                helpId="tournament-board-help"
                ref={board}
              />
            </>
          )}
          <div className="tournament-actions">
            {action && (
              <button className="control" type="button" onClick={action.run}>
                {action.label}
              </button>
            )}
            <button className="control" type="button" onClick={leave}>
              Leave tournament
            </button>
          </div>
          <TournamentBracket record={tournament} />
        </>
      )}
    </section>
  );
}
