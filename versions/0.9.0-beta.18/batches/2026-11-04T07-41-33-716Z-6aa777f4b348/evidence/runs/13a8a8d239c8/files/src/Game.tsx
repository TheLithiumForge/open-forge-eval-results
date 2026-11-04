import { useRef } from 'react';
import { isWon, matchedPairCount, totalPairCount, formatElapsedTime } from './game/state.ts';
import { Board, type BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useGameSession } from './game/session/use-game-session.ts';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const won = isWon(session.game);

  function resume(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">A memory game</p>
          <h1>Neon Pairs</h1>
        </div>
        <DealControls session={session} />
      </header>

      <section className="play-panel" aria-label="Game">
        <div className="game-summary">
          <p><span className="summary-label">Moves:</span> {session.game.moves}</p>
          <p><span className="summary-label">Pairs:</span> {matchedPairCount(session.game)}/{totalPairCount(session.game)}</p>
          <p><span className="summary-label">Time:</span> {formatElapsedTime(session.game.elapsedMs)}</p>
          <p><span className="summary-label">Best:</span> {session.bestMoves === null ? 'none' : session.bestMoves}</p>
        </div>

        {won && (
          <p className={`win-banner${session.celebration ? ' win-banner--pulse' : ''}`}>
            All pairs found in {session.game.moves} moves and {formatElapsedTime(session.game.elapsedMs)}.
          </p>
        )}

        {session.snapshotPaused && <p className="paused-note">Game paused until you resume.</p>}
        <Board
          ref={boardRef}
          game={session.game}
          dealRevision={session.dealRevision}
          activateCard={session.activateCard}
        />
        {session.snapshotPaused && <button className="resume-button" onClick={resume}>Resume</button>}
      </section>

      <ReproductionControls session={session} />
      <div className="screen-reader-status" aria-live="polite" aria-atomic="true">
        {session.announcement && <span key={session.announcement.id}>{session.announcement.text}</span>}
      </div>
    </main>
  );
}
