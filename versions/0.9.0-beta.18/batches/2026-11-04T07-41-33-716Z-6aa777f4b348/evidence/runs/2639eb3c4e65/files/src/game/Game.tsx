import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header><p className="eyebrow secondary">A LITTLE FOCUS. A GOOD MEMORY.</p>
      <h1>Neon <span>Pairs</span></h1>
      <p className="secondary">Find the familiar. Match every pair.</p>
    </header>
    <Controls size={session.game.board.size} changeSize={session.changeSize} newGame={session.newGame} restart={session.restart} />
    <Status game={session.game} best={session.best} time={session.time} celebrate={session.celebrate} />
    {session.paused && <div className="pause-panel"><p>Loaded snapshot. Select Resume to continue.</p>
      <button type="button" onClick={() => { board.current?.focusRemembered(); session.resume(); }}>Resume</button></div>}
    <Board key={session.revision} ref={board} game={session.game} activate={session.activate} />
    <p className="secondary">Reveal two cards to find a pair. Use arrow keys to move, Enter or Space to reveal.</p>
    <Reproduction boardCode={session.game.board.code} revision={session.revision} notice={session.notice}
      loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
