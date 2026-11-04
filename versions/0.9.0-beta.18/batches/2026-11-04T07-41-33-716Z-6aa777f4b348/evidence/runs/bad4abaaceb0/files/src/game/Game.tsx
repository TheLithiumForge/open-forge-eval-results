import { useRef } from "react";
import type { ReactElement } from "react";
import { Board, type BoardHandle } from "./board/Board.tsx";
import { GameControls } from "./controls/GameControls.tsx";
import { ReproductionControls } from "./controls/ReproductionControls.tsx";
import { formatTime, isWon } from "./transition.ts";
import { useGameSession } from "./session/useGameSession.ts";
import "./Game.css";

export function Game(): ReactElement {
  const { view, actions, sizes } = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const { game } = view;
  const won = isWon(game);

  return (
    <main className="game-shell" aria-labelledby="game-title">
      <header className="game-header">
        <h1 id="game-title">Neon Pairs</h1>
        <p>Find every matching pair.</p>
      </header>
      <GameControls
        game={game}
        sizes={sizes}
        best={view.best}
        paused={view.paused}
        boardRef={boardRef}
        onSizeChange={actions.changeSize}
        onNewGame={actions.startNew}
        onRestart={actions.restart}
        onResume={actions.resume}
      />
      <Board
        key={`board-${view.generation}`}
        ref={boardRef}
        game={game}
        paused={view.paused}
        onActivate={actions.activate}
      />
      {won && (
        <p className={`win-banner${view.celebration > 0 ? " win-banner--pulse" : ""}`} key={`win-${view.celebration}`}>
          You won in {game.moves} moves and {formatTime(game.elapsedMs)}.
        </p>
      )}
      <ReproductionControls
        game={game}
        generation={view.generation}
        status={view.controlStatus}
        onLoadBoard={actions.loadBoard}
        onExport={actions.snapshot}
        onLoadSnapshot={actions.loadSnapshot}
      />
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {view.announcement && <span key={view.announcement.id}>{view.announcement.text}</span>}
      </p>
    </main>
  );
}
