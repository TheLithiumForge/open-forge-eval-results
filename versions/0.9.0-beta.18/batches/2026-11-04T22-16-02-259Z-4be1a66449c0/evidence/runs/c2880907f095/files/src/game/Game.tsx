import { useRef } from 'react';
import { Board, type BoardHandle } from './board/Board';
import { DealControls } from './controls/DealControls';
import { ReproductionTools } from './controls/ReproductionTools';
import { isWon, pairCount } from './state';
import { formatTime } from './session/format';
import { useGameSession } from './session/useGameSession';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const totalPairs = session.game.board.deck.length / 2;
  const won = isWon(session.game);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair. Reveal two cards at a time and finish in as few moves as you can.</p>
      </header>
      <section className="game-area" aria-label="Neon Pairs game">
        <div className="game-stats" aria-label="Game status">
          <p>Moves: {session.game.moves}</p>
          <p>Pairs: {pairCount(session.game)}/{totalPairs}</p>
          <p>Time: {formatTime(session.game.elapsedMs)}</p>
          <p>Best: {session.best ?? 'none'}</p>
        </div>
        <DealControls size={session.game.board.size} onSizeChange={session.changeSize}
          onNewGame={session.newGame} onRestart={session.restart} />
        {session.paused && (
          <button className="action-button resume-button" type="button" onClick={() => {
            boardRef.current?.focusTabStop();
            session.resume();
          }}>Resume</button>
        )}
        <Board ref={boardRef} game={session.game} resetKey={session.revision} onActivate={session.activate} />
        {won && (
          <div className={`win-banner${session.celebrate ? ' win-banner--pulse' : ''}`}>
            <strong>All pairs found!</strong>
            <span>{session.game.moves} moves · {formatTime(session.game.elapsedMs)}</span>
          </div>
        )}
        <ReproductionTools game={session.game} boardDraft={session.boardDraft}
          snapshotDraft={session.snapshotDraft} announcement={session.announcement}
          onBoardDraft={session.setBoardDraft} onSnapshotDraft={session.setSnapshotDraft}
          onLoadBoard={session.loadBoard} onLoadSnapshot={session.loadSnapshot}
          onExportSnapshot={session.exportSnapshot} />
      </section>
    </main>
  );
}
