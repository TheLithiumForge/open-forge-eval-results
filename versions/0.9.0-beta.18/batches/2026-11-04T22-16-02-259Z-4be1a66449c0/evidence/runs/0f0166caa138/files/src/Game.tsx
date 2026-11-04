import { useRef } from "react";
import { Board, type BoardHandle } from "./game/board/Board.tsx";
import { formatElapsed } from "./game/clock.ts";
import { GameControls } from "./game/controls/GameControls.tsx";
import { ReproductionControls } from "./game/controls/ReproductionControls.tsx";
import { isWon, matchedPairs } from "./game/transitions.ts";
import { useGameSession } from "./game/session/useGameSession.ts";
import "./app.css";

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  const won = isWon(session.game);
  const pairs = matchedPairs(session.game);
  const totalPairs = session.game.deck.length / 2;

  return (
    <main className="app-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair.</p>
      </header>

      <GameControls
        size={session.game.size}
        moves={session.game.moves}
        pairs={pairs}
        totalPairs={totalPairs}
        time={formatElapsed(session.game.elapsedMs)}
        best={session.best}
        onSizeChange={session.chooseSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
      />

      {session.paused && (
        <button className="resume-button" type="button" onClick={() => {
          board.current?.focusRemembered();
          session.resume();
        }}>
          Resume
        </button>
      )}

      <Board
        key={session.resetToken}
        ref={board}
        game={session.game}
        onActivate={session.activate}
      />

      {won && (
        <section
          className={"win-banner" + (session.celebrate ? " win-banner-pulse" : "")}
          aria-label="Game complete"
        >
          <h2>All pairs found!</h2>
          <p>{session.game.moves} moves in {formatElapsed(session.game.elapsedMs)}.</p>
        </section>
      )}

      <ReproductionControls
        boardCode={session.game.boardCode}
        resetToken={session.resetToken}
        status={session.status}
        onLoadBoard={session.loadBoard}
        onExportSnapshot={session.exportSnapshot}
        onLoadSnapshot={session.loadSnapshot}
      />

      <p className="game-help">
        Select two cards to find a pair. A miss closes after a short pause.
      </p>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <span key={session.announcementId}>{session.announcement}</span>
      </div>
    </main>
  );
}
