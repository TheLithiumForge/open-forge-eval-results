import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { isWon } from './is-won.ts';
import { useGameSession } from './session/use-game-session.ts';
import { GameStatus } from './status/GameStatus.tsx';
import { WinBanner } from './status/WinBanner.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  function resume() {
    board.current?.focusRemembered();
    session.resume();
  }
  return (
    <main className="game">
      <header className="game-heading">
        <svg className="game-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path d="M17 6 32 21 17 36 2 21ZM31 12 46 27 31 42 16 27Z" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <div><h1>Neon Pairs</h1><p className="help">Reveal two cards. Find every pair.</p></div>
      </header>
      <DealControls size={session.game.board.size} onSize={session.changeSize}
        onNew={session.newGame} onRestart={session.restart} />
      <GameStatus game={session.game} best={session.best} />
      {isWon(session.game) && <WinBanner moves={session.game.moves} elapsedMs={session.game.elapsedMs} celebrate={session.celebrate} />}
      {session.paused && <p className="paused-note">Snapshot paused. Select Resume below to continue.</p>}
      <div className="board-section">
        <Board key={session.dealId} game={session.game} activate={session.activate} ref={board} />
        <p className="help board-help">Tap or click a card. Use arrow keys to move, then Enter or Space to reveal.</p>
      </div>
      <ReproductionControls session={session} onResume={resume} />
      <p className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.id}>{session.announcement.text}</span></p>
    </main>
  );
}
