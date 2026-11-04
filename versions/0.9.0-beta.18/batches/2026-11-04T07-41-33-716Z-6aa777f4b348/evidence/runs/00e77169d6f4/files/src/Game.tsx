import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { useSession } from './game/session/useSession.ts';
import { Status } from './game/session/Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main>
    <header><div className="brand-mark" aria-hidden="true">◇</div><div>
      <h1>Neon Pairs<span className="title-dot" aria-hidden="true">.</span></h1>
      <p className="secondary">A little focus. A perfect match.</p>
    </div><span className="edition" aria-hidden="true">MEMORY / 01</span></header>
    <DealControls size={session.game.board.size} resize={session.resize} newGame={session.newGame} restart={session.restart} />
    <Status game={session.game} best={session.best[session.game.board.size]} celebrate={session.celebrate} />
    {session.paused && <div className="pause-bar"><span>Snapshot paused.</span><button type="button" onClick={() => {
      board.current?.focus(); session.resume();
    }}>Resume</button></div>}
    <Board key={session.generation} ref={board} game={session.game} activate={session.activate} />
    <p className="board-help secondary">Find every pair. Take your time.<span>Arrow keys to explore · Enter or Space to reveal</span></p>
    <Reproduction boardCode={session.game.board.code} generation={session.generation} status={session.status}
      loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <footer className="secondary">Made for a moment of clarity.</footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
