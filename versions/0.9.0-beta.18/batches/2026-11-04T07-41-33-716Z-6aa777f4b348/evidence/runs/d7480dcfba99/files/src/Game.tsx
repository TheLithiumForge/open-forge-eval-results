import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { ResumeControl } from './game/controls/ResumeControl.tsx';
import { formatTime, isWon } from './game/state.ts';
import { useSession } from './game/session/useSession.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  const { game } = session;
  const won = isWon(game);
  return <main>
    <header className="masthead">
      <div className="brand">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M11 2 L21 12 L11 22 L1 12 Z" fill="none" stroke="#63E7FF" strokeWidth="2" />
          <path d="M21 10 L31 20 L21 30 L11 20 Z" fill="none" stroke="#FF71D6" strokeWidth="2" />
        </svg>
        <h1>Neon Pairs</h1>
      </div>
      <span className="edition">A LITTLE FOCUS. A FRESH PERSPECTIVE.</span>
    </header>
    <section className="intro" aria-label="How to play">
      <div><p className="eyebrow">THE MEMORY GAME</p><h2>Find your focus.</h2>
        <p className="help">Two cards. One connection. Find every pair in as few moves as you can.</p></div>
      <DealControls size={game.board.size} onSize={session.newGame} onNew={() => session.newGame()} onRestart={session.restart} />
    </section>
    <div className="stats" aria-label="Game statistics">
      <p>Moves: <strong>{game.moves}</strong></p>
      <p>Pairs: <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></p>
      <p>Time: <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p>Best: <strong>{session.best ?? 'none'}</strong></p>
    </div>
    <section className="play-area" aria-label="Game">
      <div className="board-heading"><span>{game.board.size} × {game.board.size} / FIND THE PAIRS</span>
        <span>{won ? 'COMPLETE' : session.paused ? 'PAUSED' : game.started ? 'IN PLAY' : 'READY WHEN YOU ARE'}</span></div>
      {session.paused && <ResumeControl focusBoard={() => board.current?.focusRemembered()} onResume={session.resume} />}
      {won && <div className={`win-banner${session.celebrate ? ' celebrate' : ''}`}>
        <span aria-hidden="true">✦</span><div><h2>All pairs found!</h2>
          <p>Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</p></div>
      </div>}
      <Board key={session.epoch} ref={board} game={game} activate={session.activate} />
      <div className="board-footer"><p>Reveal. Remember. Reconnect.</p><p>Arrow keys to move · Enter or Space to reveal</p></div>
    </section>
    <Reproduction revision={session.epoch} initialCode={game.board.code} onLoad={session.replace} onExport={session.exportSnapshot} onStatus={session.announce} />
    <footer className="page-footer"><span>Small moments. Sharper memory.</span><span>Made for a quiet mind.</span></footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
