import { useEffect, useRef, useState } from "react";
import { Board } from "./game/board/Board.tsx";
import type { BoardHandle } from "./game/board/Board.tsx";
import { GameControls } from "./game/controls/GameControls.tsx";
import { ReproductionControls } from "./game/controls/ReproductionControls.tsx";
import { StatusPanel } from "./game/controls/StatusPanel.tsx";
import { useGameSession } from "./game/session/useGameSession.ts";

export function Game() {
  const session = useGameSession();
  const [boardCode, setBoardCode] = useState(session.game.board.code);
  const [snapshotText, setSnapshotText] = useState("");
  const boardRef = useRef<BoardHandle | null>(null);

  useEffect(() => {
    setBoardCode(session.game.board.code);
  }, [session.game.board.code, session.dealRevision]);

  function exportSnapshot(): void {
    setSnapshotText(session.exportSnapshot());
  }

  function resume(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game-shell">
      <header className="hero">
        <p className="eyebrow">A NEON TEST OF MEMORY</p>
        <h1>Neon Pairs</h1>
        <p className="lede">Turn over two cards. Find every matching pair.</p>
      </header>

      <GameControls
        size={session.game.board.size}
        onSizeChange={session.changeSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
      />

      <StatusPanel
        game={session.game}
        bestMoves={session.bestScores[session.game.board.size]}
        paused={session.paused}
        celebration={session.celebration}
      />

      <section className="play-area" aria-label="Game board">
        <Board
          ref={boardRef}
          game={session.game}
          dealRevision={session.dealRevision}
          paused={session.paused}
          onActivate={session.activate}
        />
        <p className="board-help">Choose a card, then uncover its match.</p>
      </section>

      <ReproductionControls
        boardCode={boardCode}
        snapshotText={snapshotText}
        paused={session.paused}
        notice={session.notice}
        onBoardCodeChange={setBoardCode}
        onSnapshotChange={setSnapshotText}
        onLoadBoard={() => { session.loadBoard(boardCode); }}
        onExport={exportSnapshot}
        onLoadSnapshot={() => { session.loadSnapshot(snapshotText); }}
        onResume={resume}
      />

      <p className="live-announcement" role="status" aria-live="polite" aria-atomic="true">
        <span key={session.notice.revision}>{session.notice.text}</span>
      </p>
    </main>
  );
}
