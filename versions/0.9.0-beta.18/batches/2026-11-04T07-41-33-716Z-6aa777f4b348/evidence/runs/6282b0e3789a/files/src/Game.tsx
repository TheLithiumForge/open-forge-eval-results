import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import { Status } from './game/Status.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  const resume = () => {
    board.current?.focusRemembered();
    session.resume();
  };

  return <main className="game">
    <header className="game-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /></span>
        <div><h1>Neon Pairs</h1><p>Find your focus. Find every pair.</p></div>
      </div>
      <span className="game-tag">A little memory, a little magic.</span>
    </header>
    <DealControls size={session.game.board.size} onSize={session.changeSize}
      onNew={session.newGame} onRestart={session.restart} />
    <Status game={session.game} best={session.best} celebrate={session.celebrate} paused={session.paused} />
    <section className="play-area" aria-label="Play Neon Pairs">
      <Board key={session.dealId} ref={board} game={session.game} onActivate={session.activate} />
      <p id="board-help" className="board-help">Reveal two cards. Match their shape, marker and fill.<br />
        Use arrow keys to move, Enter or Space to reveal.</p>
    </section>
    <ReproductionControls session={session} onResume={resume} />
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
    <footer className="game-footer">Take your time. Every pair is a point.</footer>
  </main>;
}
