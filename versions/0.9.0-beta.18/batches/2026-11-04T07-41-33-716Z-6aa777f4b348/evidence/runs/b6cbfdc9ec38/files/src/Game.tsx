import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { GameControls } from './game/controls/GameControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { useGameSession } from './game/session/useGameSession.ts';
import { GameStatus } from './game/status/GameStatus.tsx';
import { LiveAnnouncement } from './game/status/LiveAnnouncement.tsx';
import './Game.css';

export function Game() {
  const session = useGameSession();
  const board = useRef<BoardHandle>(null);
  return (
    <main className="game">
      <header className="game-heading">
        <div className="title-mark" aria-hidden="true"><span>◇</span><span>◇</span></div>
        <div><h1>Neon Pairs</h1><p className="help">Find your focus. Find every pair.</p></div>
      </header>
      <GameControls size={session.game.board.size} onSize={session.chooseSize}
        onNewGame={session.newGame} onRestart={session.restart} />
      <GameStatus game={session.game} best={session.best} celebrate={session.celebrate} paused={session.paused} />
      <Board key={session.revision} ref={board} game={session.game} paused={session.paused} onActivate={session.activate} />
      <ReproductionControls boardCode={session.game.board.code} revision={session.revision}
        status={session.loadStatus} paused={session.paused} onLoadBoard={session.loadBoard}
        onLoadSnapshot={session.loadSnapshot} onExport={session.exportSnapshot}
        onResume={() => { board.current?.focusRemembered(); session.resume(); }} />
      <LiveAnnouncement event={session.announcement} />
    </main>
  );
}
