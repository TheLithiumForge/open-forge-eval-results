import { useCallback, useEffect, useRef, useState } from "react";
import { Board, type BoardFocusApi } from "./game/board/Board.js";
import { DealControls } from "./game/controls/DealControls.js";
import { ReproductionControls } from "./game/controls/ReproductionControls.js";
import { isWon } from "./game/state.js";
import { useGameSession } from "./game/session/useGameSession.js";
import "./Game.css";

export function Game() {
  const session = useGameSession();
  const [boardCodeDraft, setBoardCodeDraft] = useState(session.game.board.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  const boardFocus = useRef<BoardFocusApi | null>(null);
  const captureBoardFocus = useCallback((api: BoardFocusApi | null) => {
    boardFocus.current = api;
  }, []);

  useEffect(() => {
    setBoardCodeDraft(session.game.board.boardCode);
  }, [session.dealRevision, session.game.board.boardCode]);

  const won = isWon(session.game);
  const pairs = session.game.matched.length / 2;
  const time = formatTime(session.game.elapsedMs);
  const resume = (): void => {
    boardFocus.current?.focusRemembered();
    session.resume();
  };

  return (
    <main className="game-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair. Take a moment to remember each face.</p>
      </header>

      <section className="game-status" aria-label="Game status">
        <span>Moves: <strong>{session.game.moves}</strong></span>
        <span>Pairs: <strong>{pairs}/{session.game.board.deck.length / 2}</strong></span>
        <span>Time: <strong>{time}</strong></span>
        <span>Best: <strong>{session.bestMoves ?? "none"}</strong></span>
      </section>

      {won && (
        <div
          className={`win-banner${session.celebrating ? " win-banner--celebrating" : ""}`}
          onAnimationEnd={session.clearCelebration}
        >
          Game complete. {session.game.moves} moves in {time}.
        </div>
      )}

      <DealControls
        size={session.game.board.size}
        onSizeChange={session.selectSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
      />

      <Board
        game={session.game}
        dealRevision={session.dealRevision}
        onActivate={session.activate}
        onFocusApi={captureBoardFocus}
      />

      <ReproductionControls
        boardCode={boardCodeDraft}
        snapshot={snapshotDraft}
        status={session.reproductionStatus}
        paused={session.paused}
        onBoardCodeChange={setBoardCodeDraft}
        onSnapshotChange={setSnapshotDraft}
        onLoadBoard={() => session.loadBoard(boardCodeDraft)}
        onLoadSnapshot={() => session.loadSnapshot(snapshotDraft)}
        onExportSnapshot={() => setSnapshotDraft(session.exportSnapshot())}
        onResume={resume}
      />

      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        <span key={session.announcement.id}>{session.announcement.text}</span>
      </div>
    </main>
  );
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
