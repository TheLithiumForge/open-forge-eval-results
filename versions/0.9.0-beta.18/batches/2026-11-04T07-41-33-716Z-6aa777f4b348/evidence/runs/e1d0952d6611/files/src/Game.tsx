import { useRef, useState } from 'react';
import { Board, type BoardHandle } from './game/board/Board.tsx';
import { GameControls } from './game/controls/GameControls.tsx';
import { ReproductionControls } from './game/controls/ReproductionControls.tsx';
import { formatTime } from './game/session/formatTime.ts';
import { useGameSession } from './game/session/useGameSession.ts';
import type { GridSize } from './game/deal.ts';
import './Game.css';

type Announcement = Readonly<{ id: number; text: string }>;

export function Game() {
  const session = useGameSession();
  const boardRef = useRef<BoardHandle>(null);
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: '' });
  const [loadStatus, setLoadStatus] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const side = session.game.board.side;
  const best = session.settings.bests[side];
  const won = session.game.matched.length === session.game.board.deck.length;

  function announce(text: string): void {
    setAnnouncement((current) => ({ id: current.id + 1, text }));
  }

  function startNewGame(): void {
    session.newGame();
    setCelebrating(false);
  }

  function restartGame(): void {
    session.restart();
    setCelebrating(false);
  }

  function changeSize(size: GridSize): void {
    session.chooseSize(size);
    setCelebrating(false);
  }

  function activateCard(index: number): void {
    const result = session.activate(index);
    if (result === null) return;
    if (result.kind === 'miss') {
      announce('No match. Cards close after a short pause.');
      return;
    }
    if (result.won) {
      const time = formatTime(result.elapsedMs);
      announce(`Pair found. All pairs found in ${result.moves} moves and ${time}.`);
      setCelebrating(true);
      return;
    }
    const pair = result.pairs === 1 ? 'pair' : 'pairs';
    announce(`Pair found. ${result.pairs} ${pair} matched.`);
  }

  function loadBoard(code: string): boolean {
    if (!session.loadBoard(code)) {
      const status = 'Invalid board code.';
      setLoadStatus(status);
      announce(status);
      return false;
    }
    const status = 'Loaded board.';
    setLoadStatus(status);
    announce(status);
    setCelebrating(false);
    return true;
  }

  function loadSnapshot(text: string): 'invalid' | 'loaded' | 'completed' {
    const result = session.loadSnapshot(text);
    if (result === 'invalid') {
      const status = 'Invalid snapshot.';
      setLoadStatus(status);
      announce(status);
      return result;
    }
    const status = result === 'loaded'
      ? 'Loaded snapshot. Select Resume to continue.' : 'Loaded completed snapshot.';
    setLoadStatus(status);
    announce(status);
    setCelebrating(false);
    return result;
  }

  function resumeGame(): void {
    boardRef.current?.focusRemembered();
    session.resume();
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-heading">
          <h1>Neon Pairs</h1>
          <p>Find every matching pair.</p>
        </div>
        <GameControls size={side} paused={session.paused} onSizeChange={changeSize}
          onNewGame={startNewGame} onRestart={restartGame} onResume={resumeGame} />
      </header>

      <section className="game-status" aria-label="Game status">
        <p><span>Moves:</span> {session.game.moves}</p>
        <p><span>Pairs:</span> {session.game.matched.length / 2}/{session.game.board.deck.length / 2}</p>
        <p><span>Time:</span> {formatTime(session.game.elapsedMs)}</p>
        <p><span>Best:</span> {best === undefined ? 'none' : best}</p>
      </section>

      {session.paused ? <p className="paused-note">Imported play is paused. Select Resume to continue.</p> : null}
      {won ? <section className={`completion-banner${celebrating ? ' completion-banner--pulse' : ''}`} aria-label="Game complete">
        <h2>All pairs found!</h2>
        <p>Finished in {session.game.moves} moves and {formatTime(session.game.elapsedMs)}.</p>
      </section> : null}

      <Board ref={boardRef} state={session.game} paused={session.paused} resetKey={session.resetKey}
        onActivate={activateCard} />

      <ReproductionControls boardCode={session.game.board.boardCode} resetKey={session.resetKey}
        paused={session.paused} status={loadStatus} onLoadBoard={loadBoard} onLoadSnapshot={loadSnapshot}
        onExportSnapshot={session.exportSnapshot} />

      <div className="announcement-region" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.text}</span>
      </div>
    </main>
  );
}
