import { useRef } from "react";
import { Board } from "./game/board/Board.tsx";
import type { BoardHandle } from "./game/board/Board.tsx";
import { Controls } from "./game/controls/Controls.tsx";
import { isWon, matchedPairCount } from "./game/state.ts";
import { formatTime } from "./game/session/formatTime.ts";
import { useSession } from "./game/session/useSession.ts";
import "./Game.css";

export function Game() {
  const session = useSession();
  const boardRef = useRef<BoardHandle>(null);
  const won = isWon(session.game);
  const pairTotal = session.game.deck.length / 2;
  const pairCount = matchedPairCount(session.game);
  const resume = (): void => {
    boardRef.current?.focusTabStop();
    session.resume();
  };

  return (
    <main className="game-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair in as few moves as you can.</p>
      </header>

      <section className="game-status" aria-label="Game status">
        <p><span className="status-label">Moves:</span> {session.game.moves}</p>
        <p><span className="status-label">Time:</span> {formatTime(session.game.elapsedMs)}</p>
        <p><span className="status-label">Pairs:</span> {pairCount}/{pairTotal}</p>
        <p><span className="status-label">Best:</span> {session.bestMoves === null ? "none" : session.bestMoves}</p>
      </section>

      {won && (
        <section className={`win-banner${session.celebrationId === null ? "" : " win-banner--pulse"}`} aria-label="Game complete">
          All pairs found in {session.game.moves} moves and {formatTime(session.game.elapsedMs)}.
        </section>
      )}

      <Board key={session.revision} ref={boardRef} game={session.game} onActivate={session.activateCard} />
      <Controls session={session} onResume={resume} />
      <div className="turn-announcement" aria-live="polite" aria-atomic="true">
        <span key={session.event.id}>{session.event.text}</span>
      </div>
    </main>
  );
}
