import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import { WinBanner } from './WinBanner.tsx';
import { isWon } from './state.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  const resume = () => {
    board.current?.focusRemembered();
    session.resume();
  };
  return <main className="game">
    <header className="game-heading">
      <h1>Neon Pairs</h1>
      <p>Reveal two cards. Remember their faces. Find every pair.</p>
    </header>
    <div className="game-overview">
      <DealControls size={session.game.board.size} onSizeChange={session.changeSize}
        onNewGame={session.newGame} onRestart={session.restart} />
      <Status game={session.game} best={session.best} />
    </div>
    {isWon(session.game) && <WinBanner game={session.game} celebrate={session.celebrate} />}
    <section className="game-board" aria-labelledby="board-heading">
      <div className="board-heading">
        <h2 id="board-heading">Find the pairs</h2>
        <p>Arrow keys to move · Enter or Space to reveal</p>
      </div>
      <Board key={session.dealId} ref={board} game={session.game}
        paused={session.paused} onActivate={session.activate} />
      <p className="board-help">Matches stay face up. A miss closes after a short pause.</p>
    </section>
    <ReproductionControls boardCode={session.game.board.code} dealId={session.dealId}
      paused={session.paused} status={session.loadStatus} onLoadBoard={session.loadBoard}
      onExport={session.exportSnapshot} onLoadSnapshot={session.loadSnapshot} onResume={resume} />
    <div className="announcements" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
