import { useEffect, useRef, useState } from 'react';
import { Tournament } from './tournament/Tournament.tsx';
import { isWon } from './game.ts';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [screen, setScreen] = useState<'game' | 'tournament'>('game');
  const [returned, setReturned] = useState(false);
  if (screen === 'tournament')
    return (
      <main>
        <header>
          <p className="eyebrow">A little focus. A perfect pair.</p>
          <h1>Neon Pairs</h1>
        </header>
        <Tournament
          back={() => {
            setReturned(true);
            setScreen('game');
          }}
        />
      </main>
    );
  return <SoloGame returned={returned} tournament={() => setScreen('tournament')} />;
}

function SoloGame({ returned, tournament }: { returned: boolean; tournament(): void }) {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (returned) heading.current?.focus();
  }, [returned]);
  function openTournament(): void {
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
        <p>Leave this game?</p>
        <div>
          <button
            ref={keep}
            className="control"
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Keep playing
          </button>{' '}
          <button className="control" type="button" onClick={tournament}>
            Leave
          </button>
        </div>
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
