import { useRef } from "react";
import { formatElapsedTime } from "./clock.ts";
import { Board, type BoardHandle } from "./board/Board.tsx";
import { GameControls } from "./controls/GameControls.tsx";
import { ReproductionControls } from "./controls/ReproductionControls.tsx";
import { useGameSession } from "./session/useGameSession.ts";
import "./Game.css";

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const time = formatElapsedTime(session.game.elapsedMs);

  function resume(): void {
    boardRef.current?.focusRememberedCard();
    session.resume();
  }

  return (
    <main className="app-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every pair. Remember the faces. Finish in as few moves as you can.</p>
      </header>

      <GameControls
        bestMoves={session.bestMoves}
        moves={session.game.moves}
        onChangeSize={session.changeSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
        pairs={session.pairCount}
        size={session.size}
        time={time}
        totalPairs={session.totalPairs}
      />

      {session.paused ? (
        <div className="resume-row">
          <button onClick={resume} type="button">Resume</button>
        </div>
      ) : null}

      <Board
        key={session.dealRevision}
        game={session.game}
        onActivate={session.activateCard}
        paused={session.paused}
        ref={boardRef}
      />

      {session.won ? (
        <section
          aria-labelledby="win-title"
          className={`win-banner${session.celebrationId > 0 ? " win-banner--pulse" : ""}`}
        >
          <h2 id="win-title">All pairs found!</h2>
          <p>Moves: {session.game.moves} · Time: {time}</p>
        </section>
      ) : null}

      <ReproductionControls
        boardCode={session.game.board.code}
        dealRevision={session.dealRevision}
        onExportSnapshot={session.exportSnapshot}
        onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot}
        status={session.status}
      />

      <div aria-atomic="true" aria-live="polite" className="visually-hidden">
        {session.announcement === null ? null : (
          <span key={session.announcement.id}>{session.announcement.text}</span>
        )}
      </div>
    </main>
  );
}
