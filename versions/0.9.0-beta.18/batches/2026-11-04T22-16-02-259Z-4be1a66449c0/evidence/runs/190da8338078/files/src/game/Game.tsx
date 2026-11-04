import { useRef } from 'react';
import { Board, type BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { StatusPanel } from './StatusPanel.tsx';
import { useGameSession } from './session/useGameSession.ts';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const totalPairs = session.game.board.deck.length / 2;
  return <main className="game-shell">
    <header className="game-header">
      <a className="brand-mark" href="#game" aria-label="Neon Pairs home"><span aria-hidden="true">NP</span></a>
      <div className="heading-copy">
        <p className="eyebrow">A memory game in full color</p>
        <h1>Neon Pairs</h1>
      </div>
      <p className="header-note">Find {totalPairs} matching pairs.</p>
    </header>

    <div id="game" className="game-content">
      <StatusPanel game={session.game} best={session.best} celebration={session.celebration} />
      <DealControls size={session.size} onSizeChange={session.changeSize} onNewGame={() => session.startFresh()} onRestart={session.restart} />
      <section className="play-panel" aria-label="Game board">
        <div className="board-heading">
          <div><h2>Find the matching pairs</h2><p>Reveal two cards. Matches stay open; a miss gets a brief look before it turns back.</p></div>
          <span className="board-count">{session.game.board.size} × {session.game.board.size}</span>
        </div>
        <Board ref={boardRef} board={session.game.board} matched={session.game.matched} selection={session.game.selection} paused={session.paused} resetKey={session.epoch} onActivate={session.activate} />
        {session.paused && <div className="resume-row">
          <p>Snapshot loaded. Resume when you’re ready.</p>
          <button className="button button-primary" type="button" onClick={() => { boardRef.current?.focusRemembered(); session.resume(); }}>Resume</button>
        </div>}
      </section>
      <Reproduction
        boardDraft={session.boardDraft}
        snapshotDraft={session.snapshotDraft}
        status={session.controlStatus}
        onBoardDraft={session.setBoardDraft}
        onSnapshotDraft={session.setSnapshotDraft}
        onLoadBoard={session.loadBoard}
        onExportSnapshot={session.exportSnapshot}
        onLoadSnapshot={session.loadSnapshot}
      />
      <p className="keyboard-help">Keyboard: use the arrow keys to move through cards. Press Enter or Space to reveal one.</p>
    </div>
    <div className="live-announcer" aria-live="polite" aria-atomic="true">{session.announcement}</div>
    <footer className="game-footer"><span>Made for a sharper little memory.</span><span>Silent by design <i aria-hidden="true">✦</i></span></footer>
  </main>;
}
