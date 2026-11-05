import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { isWon } from './game.ts';
import { Tournament } from './Tournament.tsx';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const [inTournament, setInTournament] = useState(false);
  const [returned, setReturned] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const wasPaused = useRef(false);
  useEffect(() => {
    if (returned && !inTournament) heading.current?.focus();
  }, [returned, inTournament]);
  function enterTournament(): void {
    wasPaused.current = session.paused;
    controller.suspend();
    setInTournament(true);
  }
  function requestTournament(): void {
    if (game.started && !isWon(game)) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else enterTournament();
  }
  function back(): void {
    if (!wasPaused.current) controller.resume();
    setInTournament(false);
    setReturned(true);
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  if (inTournament) return <Tournament back={back} />;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      {returned && (
        <h2 ref={heading} tabIndex={-1}>
          Game
        </h2>
      )}
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={requestTournament}
      />
      <GameStatus
        game={game}
        best={session.preferences.bestMoves[String(game.size)]}
        celebration={session.celebration}
      />
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement}>{session.feedback}</span>
        </p>
      </div>
      <Board key={session.generation} game={game} activate={controller.activate} ref={board} />
      <Reproduction
        game={game}
        generation={session.generation}
        exportSnapshot={controller.exportSnapshot}
        loadBoard={controller.loadBoard}
        loadSnapshot={controller.loadSnapshot}
        notice={session.loadNotice}
        paused={session.paused}
        resume={resume}
      />
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          dialog.current?.close();
        }}
      >
        <p>Leave this unfinished game?</p>
        <div className="tournament-actions">
          <button ref={keep} className="control" onClick={() => dialog.current?.close()}>
            Keep playing
          </button>
          <button
            className="control"
            onClick={() => {
              dialog.current?.close();
              enterTournament();
            }}
          >
            Leave
          </button>
        </div>
      </dialog>
    </main>
  );
}
