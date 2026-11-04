import { useRef, type JSX } from 'react';
import { Board, type BoardFocusHandle } from './board/Board.tsx';
import { GameControls } from './controls/GameControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { useGameSession } from './session/useGameSession.ts';
import { GameStatus, TurnAnnouncements } from './Status.tsx';
import './game.css';

export function Game(): JSX.Element {
  const session = useGameSession();
  const board = useRef<BoardFocusHandle>(null);

  const resume = (): void => {
    board.current?.focusRememberedCard();
    session.resume();
  };

  return (
    <div className="app-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair. The fewer moves you use, the better.</p>
      </header>
      <main className="game-layout">
        <GameControls
          size={session.game.board.size}
          onNewGame={session.newGame}
          onRestart={session.restart}
          onChangeSize={session.changeSize}
        />
        <GameStatus game={session.game} best={session.best} celebrating={session.celebrating} />
        <Board ref={board} game={session.game} dealId={session.dealId} paused={session.paused} onActivate={session.activateCard} />
        <ReproductionControls
          boardCode={session.game.board.boardCode}
          dealId={session.dealId}
          paused={session.paused}
          status={session.status}
          onLoadBoard={session.loadBoard}
          onLoadSnapshot={session.loadSnapshot}
          onExportSnapshot={session.exportSnapshot}
          onResume={resume}
        />
        <TurnAnnouncements serial={session.announcement.serial} text={session.announcement.text} />
      </main>
    </div>
  );
}
