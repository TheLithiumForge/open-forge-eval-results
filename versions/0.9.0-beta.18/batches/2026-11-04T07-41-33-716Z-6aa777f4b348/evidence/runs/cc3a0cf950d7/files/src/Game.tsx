import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { Status } from './game/status/Status.tsx';
import { useSession } from './game/session/useSession.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const tabStop = useRef<HTMLButtonElement | null>(null);
  return <main>
    <header className="masthead">
      <div className="brand-mark" aria-hidden="true">◇</div>
      <div><p className="eyebrow">A LITTLE FOCUS GOES A LONG WAY</p><h1>Neon Pairs<span aria-hidden="true">.</span></h1></div>
      <span className="edition" aria-hidden="true">MEMORY / 01</span>
    </header>
    <div className="game-content">
      <div className="intro"><h2>Find your next match.</h2><p>Reveal two cards. Remember the shapes. Find every pair.</p></div>
      <DealControls size={session.game.board.size} newGame={session.newGame} restart={session.restart} />
      <Status game={session.game} best={session.best[session.game.board.size]} celebrate={session.celebrate} />
      {session.paused && <div className="pause"><p>Snapshot paused. Ready when you are.</p>
        <button type="button" className="primary" onClick={() => {
          tabStop.current?.focus(); session.resume();
        }}>Resume</button></div>}
      <Board key={session.revision} game={session.game} paused={session.paused}
        activate={session.activate} tabStopRef={tabStop} />
      <p className="board-help">Take your time. <span>Use arrow keys to move, Enter or Space to reveal.</span></p>
      <Reproduction code={session.game.board.code} revision={session.revision}
        loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
      <footer><span>Keep a clear mind. Make a connection.</span><span>Offline &amp; always quiet <i aria-hidden="true" /></span></footer>
    </div>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
