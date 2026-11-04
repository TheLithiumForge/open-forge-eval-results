import { useRef, useState } from "react";
import { Board, type BoardHandle } from "./board/Board";
import "./board/board.css";
import { GameControls } from "./controls/GameControls";
import "./controls/controls.css";
import { Reproduction } from "./controls/Reproduction";
import "./controls/reproduction.css";
import { Status } from "./status/Status";
import "./status/status.css";
import { isWon, matchedPairs } from "./game";
import { formatTime } from "./time";
import { useGameSession } from "./session/useGameSession";
import type { BoardSize } from "./constants";

interface Announcement { readonly id: number; readonly text: string; }

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: "" });
  const announce = (text: string) => setAnnouncement((current) => ({ id: current.id + 1, text }));

  const activate = (index: number) => {
    const { previous, next } = session.activate(index);
    if (previous === next || previous.selection.kind !== "one" || next.moves === previous.moves) return;
    if (next.selection.kind === "mismatch") {
      announce("No match. Cards close after a short pause.");
      return;
    }
    if (next.matched.size > previous.matched.size) {
      const message = isWon(next)
        ? `Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`
        : `Pair found. ${matchedPairs(next)} ${matchedPairs(next) === 1 ? "pair" : "pairs"} matched.`;
      announce(message);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-heading">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair. Reveal two cards at a time.</p>
      </header>
      <Status game={session.game} best={session.best} celebrating={session.celebrating} onCelebrationEnd={session.finishCelebration} />
      <GameControls
        size={session.game.board.size}
        onSizeChange={(size: BoardSize) => session.changeSize(size)}
        onNewGame={session.newGame}
        onRestart={session.restart}
      />
      <Board ref={boardRef} game={session.game} dealVersion={session.dealVersion} onActivate={activate} />
      <Reproduction
        game={session.game}
        dealVersion={session.dealVersion}
        paused={session.paused}
        boardRef={boardRef}
        onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot}
        onResume={session.resume}
        onStatus={announce}
      />
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.text}</span>
      </div>
    </main>
  );
}
