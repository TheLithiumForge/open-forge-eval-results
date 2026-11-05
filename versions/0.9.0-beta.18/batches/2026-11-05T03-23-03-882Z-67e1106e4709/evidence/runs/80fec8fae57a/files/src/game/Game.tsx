import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { Board } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { GameStatus } from './status/GameStatus.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { Tournament } from './tournament/Tournament.tsx';
import { LeaveDialog } from './tournament/LeaveDialog.tsx';
import './game.css';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [tournament, setTournament] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState({ text: '', player: '', event: 0 });
  const returning = useRef(false);
  const soloPaused = useRef(false);
  const publish = useCallback((text: string, player?: string) => {
    setMessage((previous) => ({
      text,
      player: player ?? previous.player,
      event: previous.event + 1,
    }));
  }, []);
  useLayoutEffect(() => {
    if (!tournament && returning.current) heading.current?.focus();
  }, [tournament]);
  function openTournament(): void {
    soloPaused.current = session.paused;
    controller.suspend();
    setConfirm(false);
    setTournament(true);
  }
  function back(): void {
    returning.current = true;
    if (!soloPaused.current) controller.resume();
    setTournament(false);
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
      {!tournament && (
        <>
          <h2 className="screen-heading" ref={heading} tabIndex={-1}>
            Game
          </h2>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            tournament={() => (game.started && !isWon(game) ? setConfirm(true) : openTournament())}
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
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          {tournament && message.player && (
            <>
              <span className="tournament-player">Now playing: {message.player}</span>{' '}
            </>
          )}
          <span key={tournament ? `t-${message.event}` : session.announcement}>
            {tournament ? message.text : session.feedback}
          </span>
        </p>
      </div>
      {tournament ? (
        <Tournament back={back} publish={publish} />
      ) : (
        <>
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
        </>
      )}
      {confirm && <LeaveDialog leave={openTournament} keepPlaying={() => setConfirm(false)} />}
    </main>
  );
}
