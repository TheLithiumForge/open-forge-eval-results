import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { Status } from './session/Status.tsx';
import { useSession } from './session/useSession.ts';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header>
      <h1>Neon Pairs</h1>
      <p className="help">Find every pair. Make each move count.</p>
    </header>
    <DealControls size={session.game.board.size} newGame={session.newGame} restart={session.restart} />
    <Status game={session.game} best={session.preferences.best[session.game.board.size]} celebrate={session.celebrate} />
    {session.paused && <div className="pause-controls">
      <p className="help">Your saved game is paused.</p>
      <button type="button" onClick={() => {
        board.current?.focusRemembered();
        session.resume();
      }}>Resume</button>
    </div>}
    <Board key={session.revision} ref={board} game={session.game} activate={session.activate} />
    <p className="help board-help">Reveal two cards to find a pair. Use arrow keys to move; Enter or Space to reveal.</p>
    <ReproductionControls boardCode={session.game.board.code} revision={session.revision} notice={session.notice}
      loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcementId}>{session.announcement}</span>
    </div>
  </main>;
}
