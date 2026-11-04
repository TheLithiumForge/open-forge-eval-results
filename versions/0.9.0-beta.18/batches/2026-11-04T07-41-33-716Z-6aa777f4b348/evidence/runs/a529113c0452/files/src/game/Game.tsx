import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { GameControls } from './controls/GameControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { Status } from './Status.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  const resume = () => {
    board.current?.focusRemembered();
    session.resume();
  };

  return (
    <main className="game">
      <header className="game-heading">
        <h1>Neon Pairs</h1>
        <p className="help">Find every pair in as few moves as you can.</p>
      </header>
      <GameControls size={session.game.board.size} onSize={session.changeSize}
        onNew={session.newGame} onRestart={session.restart} />
      <Status game={session.game} best={session.best} celebrate={session.celebrate} />
      <section className="game-play" aria-label="Play">
        <p className="help" id="board-help">Arrow keys move. Enter or Space reveals a card.</p>
        <Board key={session.resetId} ref={board} game={session.game} onActivate={session.activate} />
      </section>
      <Reproduction session={session} onResume={resume} />
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        <span key={session.announcement.id}>{session.announcement.text}</span>
      </div>
    </main>
  );
}
