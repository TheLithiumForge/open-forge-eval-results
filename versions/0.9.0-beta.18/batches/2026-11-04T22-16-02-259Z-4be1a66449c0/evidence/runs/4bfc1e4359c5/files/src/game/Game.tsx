import { useRef } from "react";
import { formatTime, isWon, matchedPairs } from "./state.ts";
import { Board } from "./board/Board.tsx";
import { DealControls } from "./controls/DealControls.tsx";
import { ReproductionControls } from "./controls/ReproductionControls.tsx";
import { useGameSession } from "./session/useGameSession.ts";
import "./game.css";

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const totalPairs = session.game.board.deck.length / 2;
  const won = isWon(session.game);

  const resume = () => {
    boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    session.resume();
  };

  return (
    <main className="appShell">
      <header className="gameHeader">
        <p className="eyebrow">A little neon, a lot of memory</p>
        <h1>Neon Pairs</h1>
        <p className="intro">Find every matching pair. Take a breath, study the faces, and make each move count.</p>
      </header>
      <section className="playPanel" aria-label="Game">
        <div className="stats" aria-label="Game status">
          <p>Moves: <strong>{session.game.moves}</strong></p>
          <p>Pairs: <strong>{matchedPairs(session.game)}/{totalPairs}</strong></p>
          <p>Time: <strong>{formatTime(session.game.elapsedMs)}</strong></p>
          <p>Best: <strong>{session.best ?? "none"}</strong></p>
        </div>
        <DealControls
          size={session.game.board.size}
          onChangeSize={session.changeSize}
          onNewGame={session.newGame}
          onRestart={session.restart}
        />
        {won && (
          <section className={`winBanner${session.celebration ? " celebrate" : ""}`} aria-label="Game complete">
            <strong>Every pair found!</strong>
            <span>{session.game.moves} moves · {formatTime(session.game.elapsedMs)}</span>
          </section>
        )}
        <Board key={session.resetToken} state={session.game} onActivate={session.activate} boardRef={boardRef} />
        <ReproductionControls {...session} onResume={resume} />
      </section>
      <footer className="footerNote">All play stays on this device. The game is silent by design.</footer>
    </main>
  );
}
