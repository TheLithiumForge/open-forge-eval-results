import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { GameStatus } from './game/session/GameStatus.tsx';
import { LiveAnnouncement } from './game/session/LiveAnnouncement.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  return <main className="game">
    <header className="game-header">
      <div className="title-line"><span className="title-mark" aria-hidden="true">◇</span><h1>Neon Pairs</h1></div>
      <p className="game-intro">A little focus. A perfect pair.</p>
    </header>
    <DealControls size={session.game.board.size} onSizeChange={session.changeSize}
      onNewGame={session.newGame} onRestart={session.restart} />
    <GameStatus game={session.game} best={session.best} paused={session.paused} celebrate={session.celebrate} />
    <div className="play-area">
      <p className="board-help">Find every pair. Use the arrow keys to move, and Enter or Space to reveal.</p>
      <Board key={session.revision} ref={board} game={session.game} paused={session.paused} onActivate={session.activate} />
    </div>
    <ReproductionControls boardCode={session.game.board.code} revision={session.revision}
      paused={session.paused} status={session.status} onLoadBoard={session.loadBoard}
      onLoadSnapshot={session.loadSnapshot} onExportSnapshot={session.exportSnapshot}
      onResume={() => { board.current?.focusRemembered(); session.resume(); }} />
    <LiveAnnouncement announcement={session.announcement} />
  </main>;
}
