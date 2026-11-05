import { useEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { Tournament } from './competition/Tournament.tsx';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const [tournament, setTournament] = useState(false);
  const [returnFocus, setReturnFocus] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (returnFocus && !tournament) {
      heading.current?.focus();
      setReturnFocus(false);
    }
  }, [returnFocus, tournament]);
  function enterTournament(): void {
    setWasPaused(session.paused);
    controller.pause();
    setTournament(true);
  }
  function requestTournament(): void {
    if (game.started && !isWon(game)) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else enterTournament();
  }
  function back(): void {
    if (!wasPaused) controller.resume();
    setTournament(false);
    setReturnFocus(true);
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {tournament ? (
        <Tournament back={back} />
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1} className="game-screen-heading">
            Game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
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
          <dialog ref={dialog} onCancel={() => {}}>
            <p>Leave the unfinished game?</p>
            <button
              className="control"
              ref={keep}
              type="button"
              onClick={() => dialog.current?.close()}
            >
              Keep playing
            </button>
            <button
              className="control"
              type="button"
              onClick={() => {
                dialog.current?.close();
                enterTournament();
              }}
            >
              Leave
            </button>
          </dialog>
        </>
      )}
    </main>
  );
}
