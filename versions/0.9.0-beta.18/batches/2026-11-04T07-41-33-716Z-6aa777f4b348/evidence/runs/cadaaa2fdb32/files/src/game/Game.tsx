import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game-shell">
    <header className="game-header">
      <div className="brand-mark" aria-hidden="true">◇</div>
      <div><h1>Neon Pairs</h1><p className="secondary">A little focus. A perfect match.</p></div>
      <span className="edition" aria-hidden="true">THE MEMORY GAME</span>
    </header>
    <section className="play-section" aria-label="Play Neon Pairs">
      <DealControls size={session.game.board.size} onNewGame={session.newGame} onRestart={session.restart} />
      <Status game={session.game} best={session.best} celebrate={session.celebrate} paused={session.paused} />
      <div className="board-heading"><h2>Find every pair.</h2><span className="secondary">Reveal. Remember. Repeat.</span></div>
      <Board key={session.generation} ref={board} game={session.game} onActivate={session.activate} />
      {session.paused && <button type="button" className="primary resume" onClick={() => {
        board.current?.focusRemembered();
        session.resume();
      }}>Resume</button>}
      <p id="board-help" className="board-help secondary">Select two cards to find a match. Use arrow keys to explore, and Enter or Space to reveal.</p>
    </section>
    <Reproduction boardDraft={session.boardDraft} onBoardDraft={session.setBoardDraft}
      snapshotDraft={session.snapshotDraft} onSnapshotDraft={session.setSnapshotDraft}
      onLoadBoard={session.loadBoard} onLoadSnapshot={session.loadSnapshot}
      onExportSnapshot={session.exportSnapshot} status={session.status} />
    <footer className="game-footer"><span>Made for a moment of focus.</span><span>Offline. Always quiet.</span></footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
