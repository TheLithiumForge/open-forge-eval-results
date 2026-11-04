import { useEffect, useRef, useState } from "react";
import { Board, type BoardHandle } from "./board/Board.tsx";
import { DealControls } from "./controls/DealControls.tsx";
import { ReproductionControls } from "./controls/ReproductionControls.tsx";
import { GameStatus } from "./status/GameStatus.tsx";
import { isWon } from "./state.ts";
import { useGameSession } from "./session/useGameSession.ts";
import { formatTime } from "./timing.ts";
import "./Game.css";

export function Game(): React.JSX.Element {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const [boardCode, setBoardCode] = useState(session.game.board.code);
  const dealId = session.dealId;
  const currentCode = session.game.board.code;
  const complete = isWon(session.game);

  useEffect(() => {
    setBoardCode(currentCode);
  }, [dealId, currentCode]);

  function resume(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  function loadBoard(): void {
    session.loadBoard(boardCode);
  }

  function loadSnapshot(text: string): void {
    session.loadSnapshot(text);
  }

  return (
    <main className="neon-app">
      <header className="neon-header">
        <div>
          <p className="neon-eyebrow">A quiet game of memory</p>
          <h1>Neon Pairs</h1>
          <p className="neon-intro">Find every pair. Arrow keys move; Enter or Space turns a card over.</p>
        </div>
      </header>
      <div className="neon-screen-reader-status" role="status" aria-live="polite" aria-atomic="true">
        <span key={session.announcement?.id ?? 0}>{session.announcement?.text ?? ""}</span>
      </div>
      <GameStatus game={session.game} bestMoves={session.bestMoves} />
      {complete ? (
        <section className={`neon-win-banner${session.celebrating ? " neon-win-banner--pulse" : ""}`}>
          <h2>All pairs found!</h2>
          <p>Finished in {session.game.moves} moves and {formatTime(session.game.elapsedMs)}.</p>
        </section>
      ) : null}
      <div className="neon-game-layout">
        <DealControls size={session.game.board.size} resumeVisible={session.paused}
          onSizeChange={session.changeSize} onNewGame={session.newGame} onRestart={session.restart}
          onResume={resume} />
        <section className="neon-board-section" aria-labelledby="neon-board-heading">
          <div className="neon-section-heading">
            <h2 id="neon-board-heading">Find the pairs</h2>
            <p>Matched cards stay open. A miss closes after a short pause.</p>
          </div>
          <Board ref={boardRef} game={session.game} paused={session.paused} dealId={session.dealId}
            onActivate={session.activateCard} />
        </section>
        <ReproductionControls boardCode={boardCode} announcement={session.announcement}
          onBoardCodeChange={setBoardCode} onLoadBoard={loadBoard} onLoadSnapshot={loadSnapshot}
          onExportSnapshot={session.exportSnapshot} />
      </div>
      <footer className="neon-footer">Every face has its own shape, marker, and fill.</footer>
    </main>
  );
}
