import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { formatTime, isWon } from './transitions.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const { game } = session;
  const board = useRef<BoardHandle>(null);
  return <main>
    <header className="game-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">◇</span><h1>Neon Pairs</h1></div>
      <p className="help">A little focus. A perfect pair.</p>
    </header>
    <DealControls size={game.board.size} newGame={session.newGame} restart={session.restart} />
    <div className="status-bar" aria-label="Game status" role="group">
      <span>Moves: <strong>{game.moves}</strong></span>
      <span>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></span>
      <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span>
      <span>Best: <strong>{session.best ?? 'none'}</strong></span>
    </div>
    {isWon(game) && <div className={`win-banner${session.celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found!</strong> {game.moves} moves · {formatTime(game.elapsedMs)}
    </div>}
    {session.paused && <div className="pause-banner">
      <span>Snapshot paused</span>
      <button type="button" onClick={() => { board.current?.focus(); session.resume(); }}>Resume</button>
    </div>}
    <Board key={session.generation} ref={board} game={game} paused={session.paused} activate={session.activate} />
    <p className="board-help help">Reveal two cards. Remember the shapes. Find every pair.<br />
      Use arrow keys to move, Enter or Space to reveal.</p>
    <Reproduction code={game.board.code} generation={session.generation} loadBoard={session.loadBoard}
      loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} />
    <div className="sr-only" aria-live="polite" aria-atomic="true">{session.announcement}</div>
    <footer className="help">Find your rhythm. Beat your best.</footer>
  </main>;
}
