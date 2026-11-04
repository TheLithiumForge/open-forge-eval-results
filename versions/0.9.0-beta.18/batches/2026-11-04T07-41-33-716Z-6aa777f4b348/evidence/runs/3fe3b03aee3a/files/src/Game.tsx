import { useEffect, useRef, useState } from "react";
import { GameControls } from "./game/controls/GameControls.tsx";
import { GameStatus } from "./game/controls/GameStatus.tsx";
import { useGameSession } from "./game/session/useGameSession.ts";
import { Board, type BoardHandle } from "./game/board/Board.tsx";
import { ReproductionControls } from "./game/controls/ReproductionControls.tsx";

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const [boardCodeDraft, setBoardCodeDraft] = useState(session.game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState("");

  useEffect(() => {
    setBoardCodeDraft(session.game.board.code);
  }, [session.boardRevision, session.game.board.code]);

  function exportSnapshot(): void {
    setSnapshotDraft(session.exportSnapshot());
  }

  function resume(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">A MEMORY GAME</p>
          <h1>NEON PAIRS</h1>
          <p className="intro">Find every matching pair in as few moves as you can.</p>
        </div>
        <div className="header-mark" aria-hidden="true"><span /><span /><span /></div>
      </header>

      <section className="game-panel" aria-label="Game">
        <GameControls
          size={session.game.board.size}
          paused={session.isPaused}
          onSizeChange={session.changeSize}
          onNewGame={session.newGame}
          onRestart={session.restart}
          onResume={resume}
        />
        <GameStatus game={session.game} bestScore={session.bestScore} celebrating={session.isCelebrating} />

        <Board key={session.boardRevision} ref={boardRef} game={session.game} onActivate={session.activate} />
        {session.isPaused && <p className="pause-note">Progress is paused. Select Resume to continue.</p>}
      </section>

      <div className="sr-announcer" role="status" aria-live="polite" aria-atomic="true">
        <span key={session.announcement.id}>{session.announcement.text}</span>
      </div>

      <ReproductionControls
        boardCode={boardCodeDraft}
        snapshotText={snapshotDraft}
        loadStatus={session.loadStatus}
        onBoardCodeChange={setBoardCodeDraft}
        onSnapshotTextChange={setSnapshotDraft}
        onLoadBoard={() => { session.loadBoard(boardCodeDraft); }}
        onLoadSnapshot={() => { session.loadSnapshot(snapshotDraft); }}
        onExportSnapshot={exportSnapshot}
      />

      <footer className="game-footer">Every face has a shape, marker and fill to help you remember it.</footer>
    </main>
  );
}
