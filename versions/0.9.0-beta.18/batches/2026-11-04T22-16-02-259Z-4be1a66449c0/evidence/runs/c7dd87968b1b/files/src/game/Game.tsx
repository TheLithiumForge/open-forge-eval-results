import { useRef } from 'react';
import { Board, type BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { formatTime, useGameSession } from './session/useGameSession.ts';
import { isWon, pairCount } from './transitions.ts';
import './game.css';

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const totalPairs = session.game.board.deck.length / 2;
  const won = isWon(session.game);
  const resume = (): void => session.resume(() => boardRef.current?.focusRemembered());

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <h1>Neon Pairs</h1>
          <p className="intro">Find every matching pair. Reveal two cards at a time.</p>
        </div>
        <div className="score-strip" aria-label="Game status">
          <span>Moves: {session.game.moves}</span>
          <span>Pairs: {pairCount(session.game)}/{totalPairs}</span>
          <span>Time: {formatTime(session.game.elapsedMs)}</span>
        </div>
      </header>

      {won && (
        <div key={session.completionPulse} className={`win-banner${session.completionPulse > 0 ? ' win-banner--pulse' : ''}`}>
          <strong>You found every pair!</strong>
          <span>{session.game.moves} moves · {formatTime(session.game.elapsedMs)}</span>
        </div>
      )}

      <Board ref={boardRef} game={session.game} epoch={session.epoch} onActivate={session.activate} />
      <DealControls
        game={session.game}
        size={session.size}
        best={session.best}
        paused={session.paused}
        onSize={session.chooseSize}
        onNew={session.startNew}
        onRestart={session.restart}
        onResume={resume}
      />
      <ReproductionControls
        boardCode={session.boardCodeDraft}
        snapshot={session.snapshotDraft}
        status={session.status}
        onBoardCode={session.setBoardCodeDraft}
        onSnapshot={session.setSnapshotDraft}
        onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot}
        onExport={session.exportSnapshot}
      />
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        <span key={session.announcementId}>{session.announcement}</span>
      </div>
    </main>
  );
}
