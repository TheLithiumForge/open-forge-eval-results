import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game-shell">
    <header className="game-header">
      <h1>Neon Pairs</h1>
      <p className="help">Find every pair. Make each move count.</p>
    </header>
    <DealControls size={session.game.board.size} paused={session.paused} onNew={() => session.newGame()}
      onRestart={session.restart} onSize={session.newGame} onResume={() => {
        board.current?.focusRemembered();
        session.resume();
      }} />
    <Status game={session.game} best={session.preferences.bests[session.game.board.size]} celebrate={session.celebrate} />
    <p id="board-help" className="help">Reveal two cards to find a pair. Use arrow keys to move, Enter or Space to reveal.</p>
    <Board key={session.generation} ref={board} game={session.game} paused={session.paused} onActivate={session.activate} />
    <ReproductionControls boardCode={session.game.board.code} generation={session.generation} status={session.status}
      onLoadBoard={session.loadBoard} onLoadSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
