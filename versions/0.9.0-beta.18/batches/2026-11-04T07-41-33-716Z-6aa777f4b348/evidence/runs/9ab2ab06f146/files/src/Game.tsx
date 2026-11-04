import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { Status } from './game/session/Status.tsx';
import { useSession } from './game/session/useSession.ts';
import { formatTime, isWon } from './game/state.ts';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  const { game } = session;
  return <main>
    <header className="masthead">
      <div className="brand-mark" aria-hidden="true">◇</div>
      <div><p className="eyebrow">A LITTLE FOCUS. A LITTLE MEMORY.</p><h1>Neon <span>Pairs</span></h1></div>
      <span className="edition" aria-hidden="true">01 / MEMORY</span>
    </header>
    <p className="intro">Turn a card. Find its twin. Make a little connection.</p>
    <section className="play-area" aria-label="Neon Pairs game">
      <DealControls size={game.board.size} onSize={session.newGame} onNew={() => session.newGame()} onRestart={session.restart} />
      <Status moves={game.moves} pairs={game.matched.length / 2} total={game.board.deck.length / 2}
        elapsedMs={game.elapsedMs} best={session.preferences.best[game.board.size]} />
      {isWon(game) && <div className={`win-banner${session.celebrate ? ' celebrate' : ''}`}>
        <h2>All pairs found.</h2><p>{game.moves} moves · {formatTime(game.elapsedMs)}. A moment well matched.</p>
      </div>}
      {session.paused && <div className="pause-banner">
        <p>Your saved game is ready.</p>
        <button type="button" onClick={() => { board.current?.focusRemembered(); session.resume(); }}>Resume</button>
      </div>}
      <div className="board-container">
        <Board key={session.generation} ref={board} board={game.board} matched={game.matched}
          selection={game.selection} onActivate={session.activate} />
      </div>
      <div className="board-caption"><span>Find every pair. Take your time.</span><span>Arrows to move · Enter or Space to reveal</span></div>
    </section>
    <Reproduction code={game.board.code} generation={session.generation} status={session.loadStatus}
      onBoard={session.loadBoard} onSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} />
    <footer><span>Made for a quiet moment.</span><span className="footer-dot" aria-hidden="true">●</span><span>Play. Remember. Repeat.</span></footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
