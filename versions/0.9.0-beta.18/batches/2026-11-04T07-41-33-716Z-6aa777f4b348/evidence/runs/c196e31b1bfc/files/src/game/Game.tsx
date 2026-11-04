import { useRef } from "react";
import { Board, type BoardHandle } from "./board/Board.tsx";
import { ReproductionControls } from "./controls/ReproductionControls.tsx";
import { GameControls } from "./controls/GameControls.tsx";
import { formatElapsedTime } from "./session/clock.ts";
import { useGameSession } from "./session/useGameSession.ts";
import "./game.css";

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const game = session.game;
  const matchedPairs = game.matched.length / 2;
  const totalPairs = game.deck.length / 2;
  const won = matchedPairs === totalPairs;

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand-mark" aria-hidden="true"><span>NP</span></div>
        <div>
          <p className="eyebrow">A game of memory</p>
          <h1>Neon Pairs</h1>
        </div>
      </header>
      <p className="game-intro">Find every matching pair. Remember the shapes, markers, and fills as you play.</p>
      <GameControls
        game={game}
        paused={session.paused}
        boardRef={boardRef}
        onChooseSize={session.chooseSize}
        onNewGame={session.newGame}
        onRestart={session.restart}
        onResume={session.resume}
      />
      <section className="play-area" aria-label="Game progress">
        <div className="game-metrics">
          <p>Moves: <strong>{game.moves}</strong></p>
          <p>Pairs: <strong>{matchedPairs}/{totalPairs}</strong></p>
          <p>Time: <strong>{formatElapsedTime(game.elapsedMs)}</strong></p>
          <p>Best: <strong>{session.bestMoves === null ? "none" : session.bestMoves}</strong></p>
        </div>
        {won ? (
          <section className={`win-banner${session.celebrationId === null ? " win-banner-static" : " win-banner-celebration"}`} aria-label="Game complete">
            <h2>Every pair found!</h2>
            <p>Finished in {game.moves} moves and {formatElapsedTime(game.elapsedMs)}.</p>
          </section>
        ) : null}
        <p className="board-help" id="board-help">Choose a card, then find its match. Use arrow keys to move around the board.</p>
        <Board
          key={session.revision}
          ref={boardRef}
          game={game}
          paused={session.paused}
          onActivate={session.activateCard}
        />
      </section>
      <section className="reproduction-section" aria-label="Reproduction tools">
        <ReproductionControls
          game={game}
          revision={session.revision}
          loadBoard={session.loadBoard}
          loadSnapshot={session.loadSnapshot}
          exportSnapshot={session.exportSnapshot}
        />
        {session.statusMessage ? <p className="visible-status" aria-hidden="true">{session.statusMessage}</p> : null}
      </section>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {session.announcement ? <span key={session.announcement.id}>{session.announcement.text}</span> : null}
      </div>
    </main>
  );
}
