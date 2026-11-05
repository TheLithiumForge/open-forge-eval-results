import { useTournamentHistory } from './tournament/use-history.ts';
import { useLayoutEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [returned, setReturned] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const wasPaused = useRef(false);
  const controller = useGame();
  const history = useTournamentHistory();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  useLayoutEffect(() => {
    if (confirming) {
      dialog.current?.showModal();
      keep.current?.focus();
    }
  }, [confirming]);
  useLayoutEffect(() => {
    if (returned && !tournament) gameHeading.current?.focus();
  }, [returned, tournament]);
  function openTournament(): void {
    wasPaused.current = controller.session.paused;
    controller.suspend();
    setTournament(true);
  }
  function returnToGame(): void {
    if (!wasPaused.current) controller.unsuspend();
    setTournament(false);
    setReturned(true);
  }
  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }
  if (tournament) return <TournamentScreen back={returnToGame} history={history} />;
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {returned && (
        <h2 ref={gameHeading} tabIndex={-1}>
          Game
        </h2>
      )}
      <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
      <Controls
        size={game.size}
        newGame={controller.newGame}
        restart={controller.restart}
        tournament={() => {
          if (game.started && !isWon(game)) setConfirming(true);
          else openTournament();
        }}
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
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          dialog.current?.close();
          setConfirming(false);
        }}
      >
        <p>Leave unfinished work?</p>
        <button
          className="control"
          type="button"
          ref={keep}
          onClick={() => {
            dialog.current?.close();
            setConfirming(false);
          }}
        >
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            dialog.current?.close();
            setConfirming(false);
            openTournament();
          }}
        >
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
