import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import { tournamentPlayer } from './results.ts';
import type { GameState } from '../game.ts';
import type { TournamentState } from './types.ts';

interface TournamentCurrentProps {
  readonly tournament: TournamentState;
  readonly game: GameState;
  readonly generation: number;
  readonly celebration: boolean;
  readonly startButton: RefObject<HTMLButtonElement | null>;
  activate(index: number): void;
  startTurn(): void;
  nextMatch(): void;
  back(): void;
}

export function TournamentCurrent({
  tournament,
  game,
  generation,
  celebration,
  startButton,
  activate,
  startTurn,
  nextMatch,
  back,
}: TournamentCurrentProps) {
  const board = useRef<BoardFocus>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);
  const shouldFocusBoard = useRef(false);
  const currentMatch = tournament.matches[tournament.currentMatchIndex];
  const champion = tournamentPlayer(tournament, tournament.championSeed)?.name;
  const showBoard =
    tournament.phase === 'playing' ||
    (isWon(game) && ['betweenTurns', 'betweenMatches', 'complete'].includes(tournament.phase));

  useEffect(() => {
    if (shouldFocusBoard.current && tournament.phase === 'playing') {
      board.current?.focusRemembered();
      shouldFocusBoard.current = false;
    }
  }, [generation, tournament.phase]);

  function beginTurn(): void {
    shouldFocusBoard.current = true;
    startTurn();
  }

  function requestLeave(): void {
    leaveDialog.current?.showModal();
    keepPlaying.current?.focus();
  }

  function confirmLeave(): void {
    leaveDialog.current?.close();
    back();
  }

  if (!currentMatch) return null;
  return (
    <section className="tournament-current" aria-labelledby="tournament-round-heading">
      <h3 id="tournament-round-heading">Round: {currentMatch.round}</h3>
      <p>
        Match {tournament.currentMatchIndex + 1} of {tournament.matches.length}
      </p>
      <p className="tournament-tie-rule">
        Fewer moves wins. Equal move counts go to the faster time, then the higher seed.
      </p>
      {tournament.phase === 'ready' && (
        <button ref={startButton} type="button" className="control" onClick={beginTurn}>
          Start turn
        </button>
      )}
      {tournament.phase === 'betweenTurns' && (
        <button ref={startButton} type="button" className="control" onClick={beginTurn}>
          Next turn
        </button>
      )}
      {tournament.phase === 'betweenMatches' && (
        <button ref={startButton} type="button" className="control" onClick={nextMatch}>
          Next match
        </button>
      )}
      {tournament.phase === 'playing' && <p>Finish the board to continue.</p>}
      {tournament.phase === 'complete' ? (
        <>
          <h3>Champion: {champion}</h3>
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <button type="button" className="control" onClick={requestLeave}>
          Leave tournament
        </button>
      )}
      <dialog
        className="tournament-leave-dialog"
        ref={leaveDialog}
        aria-labelledby="leave-tournament-heading"
      >
        <h3 id="leave-tournament-heading">Leave tournament?</h3>
        <p>The current tournament will stop. It will not be added to Past tournaments.</p>
        <div className="tournament-actions">
          <button
            ref={keepPlaying}
            type="button"
            className="control"
            onClick={() => leaveDialog.current?.close()}
          >
            Keep playing
          </button>
          <button type="button" className="control" onClick={confirmLeave}>
            Leave
          </button>
        </div>
      </dialog>
      {showBoard && (
        <>
          <GameStatus game={game} best={undefined} celebration={celebration} showBest={false} />
          <p id="tournament-board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={generation}
            game={game}
            activate={activate}
            ref={board}
            helpId="tournament-board-help"
          />
        </>
      )}
      <TournamentBracket tournament={tournament} highlightCurrent />
    </section>
  );
}
