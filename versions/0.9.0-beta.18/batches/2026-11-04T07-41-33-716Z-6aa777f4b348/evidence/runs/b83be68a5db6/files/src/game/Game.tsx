import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import { isWon } from './state.ts';
import { formatTime } from './format-time.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const focusBoard = useRef<(() => void) | null>(null);
  const { state } = session;
  return <main>
    <header className="page-header">
      <div className="brand-mark" aria-hidden="true"><span>◇</span><span>◇</span></div>
      <div><h1>Neon Pairs</h1><p className="help">A little focus. Every pair.</p></div>
      <span className="edition" aria-hidden="true">MEMORY / 01</span>
    </header>
    <div className="game-heading">
      <p>Find the pairs.<br /><span className="help">Reveal two cards. Remember what you see.</span></p>
      <span className="board-size">{state.board.size} × {state.board.size}</span>
    </div>
    <DealControls size={state.board.size} onSize={session.newGame} onNew={() => session.newGame()}
      onRestart={session.restart} />
    <Status state={state} best={session.best} />
    {isWon(state) && <div className={`win-banner${session.celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found.</strong><span>{state.moves} moves · {formatTime(state.elapsedMs)}</span>
    </div>}
    {session.paused && <div className="pause-panel"><span>Progress loaded. Ready when you are.</span>
      <button type="button" onClick={() => { focusBoard.current?.(); session.resume(); }}>Resume</button>
    </div>}
    <Board key={session.revision} state={state} onActivate={session.activate} focusBoard={focusBoard} />
    <p className="board-help help">Click or tap to reveal · Arrow keys to move · Enter or Space to reveal</p>
    <Reproduction code={state.board.boardCode} revision={session.revision} status={session.status}
      onBoard={session.loadBoard} onSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} />
    <footer className="help">Take your time. Make it memorable.</footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
