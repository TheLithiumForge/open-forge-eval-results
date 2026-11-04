import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useSession } from './game/session/useSession.ts';
import { Status } from './game/Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game-shell">
    <header className="game-heading">
      <h1>Neon Pairs<span aria-hidden="true"> ◇</span></h1>
      <p className="help">Find every pair. Make every move count.</p>
    </header>
    <DealControls size={session.game.board.size} changeSize={session.changeSize}
      newGame={session.newGame} restart={session.restart} />
    <Status game={session.game} best={session.preferences.bests[session.game.board.size]}
      celebrate={session.celebrate} />
    <Board key={session.dealId} ref={board} game={session.game} paused={session.paused}
      activate={session.activate} />
    {session.paused && <div className="resume-controls">
      <p className="help">Your saved game is paused.</p>
      <button type="button" onClick={() => {
        board.current?.focusRemembered();
        session.resume();
      }}>Resume</button>
    </div>}
    <p className="help board-help">Reveal two cards with a click or tap. Use arrow keys to move, Enter or Space to reveal.</p>
    <ReproductionControls boardCode={session.game.board.code} dealId={session.dealId}
      status={session.loadStatus} loadBoard={session.loadBoard}
      loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
