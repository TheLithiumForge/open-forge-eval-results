import { Board } from './game/board/Board.tsx';
import { Controls } from './game/controls/Controls.tsx';
import { isWon, matchedPairs } from './game/core.ts';
import { useGameSession } from './game/session/useGameSession.ts';
import { formatElapsedTime } from './game/session/time.ts';
import './game/game.css';

export function Game() {
  const session = useGameSession();
  const { game } = session;
  const pairs = matchedPairs(game);
  const won = isWon(game);
  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">A quiet game of memory</p>
          <h1>Neon Pairs</h1>
        </div>
        <p className="intro">Find each matching pair. Every face has a shape, marker and fill to help you remember it.</p>
      </header>

      <section className="game-panel" aria-label="Neon Pairs game">
        <div className="game-topline">
          <div className="scoreboard" aria-label="Game status">
            <span>Moves: {game.moves}</span>
            <span>Pairs: {pairs}/{game.deck.length / 2}</span>
            <span>Time: {formatElapsedTime(game.elapsedMs)}</span>
            <span>Best: {session.best ?? 'none'}</span>
          </div>
          {won && <div className={`win-banner${session.celebrating ? ' win-celebrate' : ''}`}>
            <strong>All pairs found!</strong>
            <span>{game.moves} moves · {formatElapsedTime(game.elapsedMs)}</span>
          </div>}
          {session.paused && <p className="pause-note">Snapshot loaded. Play is paused.</p>}
        </div>

        <Controls session={session} size={game.size} />
        <Board
          game={game}
          paused={session.paused}
          resetToken={session.resetToken}
          resumeToken={session.resumeToken}
          onActivate={session.activate}
        />
        <p className="live-status" role="status" aria-live="polite" aria-atomic="true">
          <span key={session.announcement.id}>{session.announcement.text}</span>
        </p>
      </section>
      <footer>Play silently with mouse, touch or keyboard. Use the arrow keys to move around the board.</footer>
    </main>
  );
}
