import { useEffect, useRef, useState } from 'react';
import { Tournament } from './Tournament.tsx';
import { isWon } from './game.ts';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [returned, setReturned] = useState(false);
  return tournament ? (
    <Tournament
      back={() => {
        setReturned(true);
        setTournament(false);
      }}
    />
  ) : (
    <SoloGame returned={returned} open={() => setTournament(true)} />
  );
}

function SoloGame({ open, returned }: { open(): void; returned: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (returned) heading.current?.focus();
  }, [returned]);
  const controller = useGame();
  const dialog = useRef<HTMLDialogElement>(null);
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
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
      {returned && (
        <h2 ref={heading} tabIndex={-1}>
          Game
        </h2>
      )}
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={() => {
          if (game.started && !isWon(game)) dialog.current?.showModal();
          else open();
        }}
      />
      <dialog ref={dialog}>
        <p>Leave this game?</p>
        <button type="button" className="control" autoFocus onClick={() => dialog.current?.close()}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={open}>
          Leave
        </button>
      </dialog>
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
    </main>
  );
}
