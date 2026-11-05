import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import type { TournamentState } from './model.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import './tournament.css';

interface TournamentPlayProps {
  tournament: TournamentState;
  activate(index: number): void;
  startTurn(): void;
  nextTurn(): void;
  nextMatch(): void;
  leave(): void;
  backToGame(): void;
}

export function TournamentPlay(props: TournamentPlayProps) {
  const { tournament } = props;
  const match = tournament.matches[tournament.currentMatch];
  const game = tournament.activeGame;
  const currentResult = match?.results[tournament.currentTurn] ?? null;
  const board = useRef<BoardFocus>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const hasGame = game !== null;

  useEffect(() => {
    if (tournament.status === 'finished') backButton.current?.focus();
    else if (currentResult) nextButton.current?.focus();
    else if (tournament.turnRunning && hasGame) board.current?.focusRemembered();
    else startButton.current?.focus();
  }, [
    tournament.currentMatch,
    tournament.currentTurn,
    tournament.turnRunning,
    hasGame,
    currentResult,
    tournament.status,
  ]);

  if (!match) return null;
  const canAdvanceMatch = tournament.currentMatch < tournament.matches.length - 1;
  return (
    <section className="tournament-play" aria-labelledby="tournament-play-heading">
      <h3 id="tournament-play-heading">Tournament bracket</h3>
      {game && <GameStatistics game={game} />}
      {game && (
        <>
          <p id="tournament-board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={`${tournament.currentMatch}-${tournament.currentTurn}`}
            ref={board}
            game={game}
            activate={props.activate}
            helpId="tournament-board-help"
            regionLabel="Tournament game board"
            enabled={tournament.turnRunning}
          />
        </>
      )}
      <div className="tournament-actions">
        {tournament.status === 'active' && !currentResult && (
          <button ref={startButton} type="button" className="control" onClick={props.startTurn}>
            Start turn
          </button>
        )}
        {tournament.status === 'active' && currentResult && tournament.currentTurn === 0 && (
          <button ref={nextButton} type="button" className="control" onClick={props.nextTurn}>
            Next turn
          </button>
        )}
        {tournament.status === 'active' &&
          currentResult &&
          tournament.currentTurn === 1 &&
          canAdvanceMatch && (
            <button ref={nextButton} type="button" className="control" onClick={props.nextMatch}>
              Next match
            </button>
          )}
        {tournament.status === 'active' && (
          <button type="button" className="control" onClick={props.leave}>
            Leave tournament
          </button>
        )}
        {tournament.status === 'finished' && (
          <button ref={backButton} type="button" className="control" onClick={props.backToGame}>
            Back to game
          </button>
        )}
      </div>
      <TournamentBracket tournament={tournament} />
    </section>
  );
}

function GameStatistics({ game }: { game: NonNullable<TournamentState['activeGame']> }) {
  return (
    <dl className="stats tournament-stats">
      <div>
        <dt>Moves:</dt> <dd>{game.moves}</dd>
      </div>
      <div>
        <dt>Pairs:</dt>{' '}
        <dd>
          {game.matched.length / 2}/{game.deck.length / 2}
        </dd>
      </div>
      <div>
        <dt>Time:</dt> <dd>{formatElapsed(game.elapsedMs)}</dd>
      </div>
    </dl>
  );
}
