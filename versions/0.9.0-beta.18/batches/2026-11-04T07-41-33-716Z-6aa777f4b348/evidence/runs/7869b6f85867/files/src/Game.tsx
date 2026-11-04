import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { Status } from './game/Status.tsx';
import { formatTime, isWon } from './game/state.ts';
import { useSession } from './game/session/useSession.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const focusBoard = useRef<(() => void) | null>(null);
  const won = isWon(session.game);
  return <main>
    <header className="game-header">
      <div className="brand-mark" aria-hidden="true"><span>◇</span><span>◇</span></div>
      <div><p className="eyebrow">A LITTLE FOCUS. A LITTLE DISCOVERY.</p><h1>Neon Pairs</h1></div>
    </header>
    <p className="intro">Find the connection. Reveal two cards and match every pair.</p>
    <DealControls size={session.game.board.size} changeSize={session.changeSize}
      newGame={session.newGame} restart={session.restart} />
    <Status game={session.game} best={session.preferences.best[session.game.board.size]} />
    {session.paused && <div className="pause-notice"><p>Progress loaded. Ready when you are.</p>
      <button type="button" className="primary" onClick={() => {
        focusBoard.current?.();
        session.resume();
      }}>Resume</button></div>}
    {won && <div className={`win-banner ${session.celebrate ? 'celebrate' : ''}`}>
      <strong>All pairs found!</strong><p>{session.game.moves} moves · {formatTime(session.game.elapsedMs)}</p>
    </div>}
    <Board key={session.revision} game={session.game} activate={session.activate} focusBoard={focusBoard} />
    <p className="help board-help">Take your time. Each pair is a shape, a marker, and a fill.<br />
      Use arrow keys to move, Enter or Space to reveal.</p>
    <Reproduction boardCode={session.game.board.code} revision={session.revision}
      status={session.loadStatus} loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot}
      exportSnapshot={session.exportSnapshot} />
    <footer><span className="footer-diamond" aria-hidden="true">◇</span> A quiet moment for your memory.</footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
