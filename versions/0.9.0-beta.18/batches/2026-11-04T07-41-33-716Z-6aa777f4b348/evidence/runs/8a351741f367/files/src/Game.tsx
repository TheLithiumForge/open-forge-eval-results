import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useSession } from './game/session/useSession.ts';
import { GameStatus } from './GameStatus.tsx';
import './Game.css';

export function Game() {
  const session = useSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header className="game-header">
      <h1><span aria-hidden="true" className="title-mark">◇</span> Neon Pairs</h1>
      <p className="help">Find every pair. Make every reveal count.</p>
    </header>
    <DealControls size={session.game.board.size} onSize={session.changeSize}
      onNew={session.newGame} onRestart={session.restart} />
    <GameStatus game={session.game} best={session.preferences.best[session.game.board.size]} celebrate={session.celebrate} />
    {session.paused && <div className="resume-panel">
      <p className="help">Your snapshot is paused.</p>
      <button type="button" onClick={() => { board.current?.focusRemembered(); session.resume(); }}>Resume</button>
    </div>}
    <Board key={session.epoch} ref={board} game={session.game} onActivate={session.activate} />
    <p className="help">Reveal two cards to find a pair. Use arrow keys to move, and Enter or Space to reveal.</p>
    <ReproductionControls boardCode={session.game.board.code} epoch={session.epoch} status={session.loadStatus}
      onBoard={session.loadBoard} onSnapshot={session.loadSnapshot} onExport={session.exportSnapshot} />
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
