import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import { Status } from './game/status/Status.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  function resume(): void {
    board.current?.focusRemembered();
    session.resume();
  }
  return <main className="game">
    <header className="game-header">
      <h1>Neon Pairs</h1>
      <p>Find every pair. Make every move count.</p>
    </header>
    <DealControls size={session.game.board.size} onSize={session.changeSize}
      onNewGame={session.newGame} onRestart={session.restart} />
    <Status game={session.game} best={session.best} celebrate={session.celebrate} />
    <section className="play-area" aria-label="Play Neon Pairs">
      {session.paused && <p className="pause-note">Paused. Select Resume to continue.</p>}
      <Board key={session.dealRevision} ref={board} game={session.game} onActivate={session.activate} />
      <p className="board-help">Reveal two cards to find a pair. Use arrow keys to move, Enter or Space to reveal.</p>
    </section>
    <ReproductionControls boardCode={session.game.board.boardCode} dealRevision={session.dealRevision}
      paused={session.paused} status={session.loadStatus} onLoadBoard={session.loadBoard}
      onLoadSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} onResume={resume} />
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
