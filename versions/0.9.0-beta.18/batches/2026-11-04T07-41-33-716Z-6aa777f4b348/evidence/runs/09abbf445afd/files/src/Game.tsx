import { useRef } from 'react';
import { isWon } from './game/transitions.ts';
import { useGameSession } from './game/session/useGameSession.ts';
import { formatElapsedTime } from './game/session/formatTime.ts';
import { Board, type BoardHandle } from './game/board/Board.tsx';
import { GameControls } from './game/controls/GameControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import './Game.css';

export function Game(): React.JSX.Element {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const won = isWon(session.state);
  const pairCount = session.state.matched.length / 2;
  const totalPairs = (session.state.board.size * session.state.board.size) / 2;
  const faceTime = formatElapsedTime(session.state.elapsedMs);

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="game-eyebrow">A memory match game</p>
          <h1>Neon Pairs</h1>
          <p className="game-intro">Find every pair. Remember each shape, marker, and fill.</p>
        </div>
        <GameControls size={session.state.board.size} onSizeChange={session.changeSize} onNewGame={session.newGame} onRestart={session.restart} />
      </header>

      <section className="game-summary" aria-label="Game status">
        <p>Moves: {session.state.moves}</p>
        <p>Pairs: {pairCount}/{totalPairs}</p>
        <p>Time: {faceTime}</p>
        <p>Best: {session.best ?? 'none'}</p>
      </section>

      {won && (
        <section className={`win-banner${session.celebration ? ' win-banner--pulse' : ''}`} aria-label="Game complete">
          <h2>Every pair found</h2>
          <p>Finished in {session.state.moves} moves and {faceTime}.</p>
        </section>
      )}

      <p className="board-help">Choose a card, then find its match. Use the arrow keys to move around the board.</p>
      <Board
        ref={boardRef}
        game={session.state}
        paused={session.paused}
        revision={session.revision}
        onActivate={session.activateCard}
      />

      <ReproductionControls session={session} onResume={() => {
        boardRef.current?.focusRememberedCard();
        session.resume();
      }} />

      <p className="sound-note">This game is silent. Card states and turn results appear on screen.</p>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {session.announcement && <span key={session.announcement.id}>{session.announcement.text}</span>}
      </div>
    </main>
  );
}
