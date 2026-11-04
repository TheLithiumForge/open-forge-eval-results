import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardFocusHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { formatElapsed } from './game/session/activeClock.ts';
import { useGameSession } from './game/session/useGameSession.ts';
import './styles.css';

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardFocusHandle>(null);
  const pairs = session.game.matched.length / 2;
  const totalPairs = session.game.board.deck.length / 2;
  const won = pairs === totalPairs;

  function resumeGame(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" /> MEMORY GAME</p>
        <h1>Neon Pairs</h1>
        <p className="intro">Find the matching faces. Remember each one as you go.</p>
      </header>

      <DealControls
        size={session.size}
        onSizeChange={session.changeSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
      />

      <section className="score-strip" aria-label="Game status">
        <p><span className="score-label">Moves:</span> {session.game.moves}</p>
        <p><span className="score-label">Pairs:</span> {pairs}/{totalPairs}</p>
        <p><span className="score-label">Time:</span> {formatElapsed(session.game.elapsedMs)}</p>
        <p><span className="score-label">Best:</span> {session.bestMoves === null ? 'none' : session.bestMoves}</p>
      </section>

      {won ? (
        <p className={`win-banner${session.celebration ? ' is-new-win' : ''}`}>
          Board cleared <span aria-hidden="true">·</span> {session.game.moves} moves <span aria-hidden="true">·</span> {formatElapsed(session.game.elapsedMs)}
        </p>
      ) : null}

      <div className="live-announcer" aria-live="polite" aria-atomic="true">
        <span key={session.announcement?.id ?? 'empty'}>{session.announcement?.text ?? ''}</span>
      </div>

      <Board
        key={session.dealId}
        ref={boardRef}
        game={session.game}
        paused={session.paused}
        onActivate={session.activate}
      />

      <ReproductionControls session={{ ...session, resume: resumeGame }} />
    </main>
  );
}
