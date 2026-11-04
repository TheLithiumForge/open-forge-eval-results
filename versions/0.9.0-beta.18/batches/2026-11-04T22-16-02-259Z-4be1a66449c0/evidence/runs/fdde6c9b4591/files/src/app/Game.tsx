import { useRef, useState } from "react";
import { Board, type BoardHandle } from "../game/board/Board.tsx";
import { DealControls, ReproductionControls } from "../game/controls/Controls.tsx";
import { formatTime } from "../game/time.ts";
import { isWon } from "../game/turns.ts";
import { useGameSession } from "../game/session/useGameSession.ts";
import type { TurnResult } from "../game/session/useGameSession.ts";
import "./Game.css";

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const [announcement, setAnnouncement] = useState({ text: "", pulse: false });
  const game = session.game;
  const won = isWon(game);
  const best = session.bestScores[game.board.side];

  const announce = (text: string) => setAnnouncement((current) => ({ text, pulse: !current.pulse }));
  const clearAnnouncement = () => setAnnouncement((current) => ({ text: "", pulse: !current.pulse }));
  const announceTurn = (result: TurnResult | null) => {
    if (!result) return;
    if (result.kind === "miss") {
      announce("No match. Cards close after a short pause.");
    } else if (result.won) {
      announce(`Pair found. All pairs found in ${result.moves} moves and ${formatTime(result.elapsedMs)}.`);
    } else {
      const noun = result.pairs === 1 ? "pair" : "pairs";
      announce(`Pair found. ${result.pairs} ${noun} matched.`);
    }
  };

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">A memory game</p>
          <h1>Neon Pairs</h1>
        </div>
        <p className="intro">Find every matching pair in as few moves as you can.</p>
      </header>

      <DealControls
        side={game.board.side}
        onChooseSize={session.chooseSize}
        onNewGame={() => { session.newGame(); clearAnnouncement(); }}
        onRestart={() => { session.restart(); clearAnnouncement(); }}
      />

      <section className="game-status" aria-label="Game status">
        <p>Moves: {game.moves}</p>
        <p>Time: {formatTime(game.elapsedMs)}</p>
        <p>Pairs: {game.matched.length / 2}/{game.board.deck.length / 2}</p>
        <p>Best: {best === undefined ? "none" : best}</p>
      </section>

      {won && (
        <div className={`win-banner${session.celebration ? " animate-win" : ""}`}>
          <strong>All pairs found!</strong>
          <span>{game.moves} moves · {formatTime(game.elapsedMs)}</span>
        </div>
      )}

      <Board ref={boardRef} game={game} resetKey={session.revision} paused={session.paused} onActivate={(index) => announceTurn(session.activate(index))} />

      <ReproductionControls
        game={game}
        revision={session.revision}
        paused={session.paused}
        onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot}
        onResume={() => { boardRef.current?.focusRememberedCard(); session.resume(); }}
        onStatus={announce}
      />

      <div className="game-announcement" role="status" aria-live="polite" aria-atomic="true">
        {announcement.text}<span>{announcement.pulse ? "\u200B" : ""}</span>
      </div>
    </main>
  );
}
