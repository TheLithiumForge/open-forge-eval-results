import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { useSession } from './game/session/useSession.ts';
import { Status } from './game/Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header className="masthead">
      <div className="brand"><span className="brand-symbol" aria-hidden="true">◇</span>
        <div><h1>Neon Pairs</h1><p className="help">A little focus. A perfect pair.</p></div>
      </div>
      <span className="edition">The quiet memory game</span>
    </header>
    <section className="play-section" aria-label="Play Neon Pairs">
      <DealControls size={session.game.board.size} newGame={session.newGame} restart={session.restart} />
      <Status game={session.game} best={session.scores[session.game.board.size]} celebrate={session.celebrate} />
      {session.paused && <div className="pause-banner">
        <p>Snapshot paused. Take a moment, then continue.</p>
        <button className="primary" type="button" onClick={() => {
          board.current?.focusRemembered();
          session.resume();
        }}>Resume</button>
      </div>}
      <Board key={session.deal} ref={board} game={session.game} activate={session.activate} />
      <p className="board-help help">Reveal two cards. Find every pair.<span>Tap or click · Arrow keys to move · Enter or Space to reveal</span></p>
    </section>
    <Reproduction boardCode={session.game.board.code} deal={session.deal} loadBoard={session.loadBoard}
      loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <footer className="help">Made for a moment of focus. Always offline, always silent.</footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">{session.message}</div>
  </main>;
}
