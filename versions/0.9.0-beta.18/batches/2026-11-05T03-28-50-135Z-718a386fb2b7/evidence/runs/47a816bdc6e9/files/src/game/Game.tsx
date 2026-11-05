import { useEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { Tournament } from './tournament/Tournament.tsx';
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
    <main>
      <Tournament
        back={() => {
          setReturned(true);
          setTournament(false);
        }}
      />
    </main>
  ) : (
    <SoloGame tournament={() => setTournament(true)} returned={returned} />
  );
}

function SoloGame({ tournament, returned }: { tournament(): void; returned: boolean }) {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (returned) heading.current?.focus();
  }, [returned]);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  function openTournament() {
    if (game.started && !isWon(game)) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else tournament();
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
        tournament={openTournament}
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
      <dialog ref={dialog}>
        <p>Leave this unfinished game?</p>
        <button ref={keep} className="control" onClick={() => dialog.current?.close()}>
          Keep playing
        </button>
        <button className="control" onClick={tournament}>
          Leave
        </button>
      </dialog>
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
