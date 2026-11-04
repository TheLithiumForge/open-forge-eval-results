import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { GameStatus } from './game/session/GameStatus.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game-shell">
    <header>
      <h1>Neon Pairs</h1>
      <p className="help">Find every pair. Remember the shapes, markers and fills.</p>
    </header>
    <DealControls size={session.game.board.size} onSizeChange={session.startNew}
      onNew={() => session.startNew()} onRestart={session.restart} />
    <GameStatus game={session.game} best={session.preferences.best[session.game.board.size]}
      celebrate={session.celebrate} />
    <p className="help">Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal.</p>
    {session.paused && <p className="pause-note">Snapshot paused. Select Resume in Reproduce a game.</p>}
    <Board key={session.dealId} ref={board} game={session.game} paused={session.paused}
      onActivate={session.activate} />
    <ReproductionControls boardCode={session.game.board.code} dealId={session.dealId} paused={session.paused}
      boardStatus={session.boardStatus} snapshotStatus={session.snapshotStatus}
      onLoadBoard={session.loadBoard} onLoadSnapshot={session.loadSnapshot} onExport={session.exportSnapshot}
      onResume={() => { board.current?.focusRemembered(); session.resume(); }} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
