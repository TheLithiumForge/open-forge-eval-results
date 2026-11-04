import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import { isWon } from './game/state.ts';
import { CompletionBanner } from './CompletionBanner.tsx';
import { GameStatus } from './GameStatus.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  const { game } = session;

  function resume(): void {
    board.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p className="help">Find every matching pair in as few moves as you can.</p>
      </header>
      <DealControls size={game.board.size} onSizeChange={session.chooseSize}
        onNewGame={session.newGame} onRestart={session.restart} />
      <GameStatus game={game} best={session.best} />
      <p className="help board-help">Reveal two cards. Use the arrow keys to move and Enter or Space to reveal.</p>
      {session.paused && (
        <div className="pause-panel">
          <p>Snapshot paused.</p>
          <button type="button" onClick={resume}>Resume</button>
        </div>
      )}
      <Board ref={board} game={game} blocked={session.paused}
        revision={session.revision} onActivate={session.activate} />
      {isWon(game) && <CompletionBanner game={game} celebrate={session.celebrate} />}
      <ReproductionControls boardCode={game.board.code} revision={session.revision}
        status={session.loadStatus} onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot} onExportSnapshot={session.exportSnapshot} />
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        <span key={session.announcement.id}>{session.announcement.text}</span>
      </div>
    </main>
  );
}
