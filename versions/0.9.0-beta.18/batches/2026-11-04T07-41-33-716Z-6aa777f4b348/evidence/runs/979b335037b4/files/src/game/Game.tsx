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
  return <main>
    <header className="game-header">
      <div className="brand-mark" aria-hidden="true">◇</div>
      <div><h1>Neon Pairs</h1><p>Find your focus. Find every pair.</p></div>
      <span className="header-note">A moment for your memory</span>
    </header>
    <section className="play-area" aria-label="Memory game">
      <DealControls size={session.game.board.size} newGame={session.newGame} restart={session.restart}
        paused={session.paused} resume={() => { board.current?.focus(); session.resume(); }} />
      <Status game={session.game} best={session.bests[session.game.board.size]}
        celebrate={session.celebrate} paused={session.paused} />
      <Board key={session.epoch} ref={board} game={session.game} activate={session.activate} />
      <div className="board-caption"><span className="caption-dot" aria-hidden="true" />
        <p>Reveal two cards. Remember the shapes. Find their match.</p>
      </div>
    </section>
    <ReproductionControls boardCode={session.game.board.code} epoch={session.epoch}
      status={session.loadStatus} loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot}
      exportSnapshot={session.exportSnapshot} />
    <footer>Play with a click, a tap, or arrow keys + Enter / Space.</footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.notice.id}>{session.notice.text}</span>
    </div>
  </main>;
}
