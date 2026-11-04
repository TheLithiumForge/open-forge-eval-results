import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useGameSession } from './session/useGameSession.ts';
import { Status } from './Status.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header className="game-heading">
      <div className="brand-mark" aria-hidden="true"><span>◇</span><span>◇</span></div>
      <div><h1>Neon Pairs</h1><p className="help">A little focus. A perfect match.</p></div>
    </header>
    <DealControls size={session.game.board.size} onSize={session.newGame}
      onNewGame={() => session.newGame()} onRestart={session.restart} />
    <Status game={session.game} best={session.best} celebrate={session.celebrate} />
    {session.paused && <div className="pause-panel">
      <p>Snapshot paused</p>
      <button type="button" onClick={() => {
        board.current?.focusRemembered();
        session.resume();
      }}>Resume</button>
    </div>}
    <Board ref={board} game={session.game} paused={session.paused}
      dealId={session.dealId} onActivate={session.activate} />
    <Reproduction boardCode={session.game.board.code} dealId={session.dealId}
      status={session.loadStatus} onLoadBoard={session.loadBoard}
      onLoadSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
    <footer className="help game-footer">Made for a quiet moment. Play at your own pace.</footer>
  </main>;
}
