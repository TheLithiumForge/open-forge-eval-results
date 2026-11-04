import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { GameControls } from './controls/GameControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { useSession } from './session/useSession.ts';
import { isWon } from './state.ts';
import { formatTime } from './time.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const { game } = session;
  const board = useRef<BoardHandle>(null);
  const pairs = game.matched.length / 2;
  const total = game.board.deck.length / 2;
  const won = isWon(game);
  return <main className="game-shell">
    <header className="masthead">
      <a className="wordmark" href="#main-game" aria-label="Neon Pairs home"><span aria-hidden="true">◇</span> NEON PAIRS</a>
      <span className="edition">A MOMENT OF FOCUS</span>
    </header>
    <section id="main-game" className="game-content" aria-labelledby="game-title">
      <div className="introduction">
        <p className="eyebrow"><span aria-hidden="true" />THE MEMORY GAME</p>
        <h1 id="game-title">Small cards. <span>Sharp mind.</span></h1>
        <p className="subtitle">Turn over two. Find their connection. Make every move count.</p>
      </div>
      <GameControls size={game.board.size} onSize={session.changeSize} onNew={session.newGame} onRestart={session.restart} />
      <div className="scoreboard" aria-label="Game statistics">
        <p>Moves: <strong>{game.moves}</strong></p>
        <p>Pairs: <strong>{pairs}/{total}</strong></p>
        <p>Time: <strong>{formatTime(game.elapsedMs)}</strong></p>
        <p>Best: <strong>{session.preferences.bests[game.board.size] ?? 'none'}</strong></p>
      </div>
      <div className="board-heading"><span>{game.board.size} × {game.board.size} <span className="muted">/ FIND ALL {total} PAIRS</span></span>
        <span className="muted">{session.paused ? 'PAUSED' : won ? 'COMPLETE' : game.started ? 'IN PLAY' : 'YOUR MOVE'}</span></div>
      {won && <div className={`win-banner${session.celebration ? ' celebrate' : ''}`}>
        <span aria-hidden="true">✧</span><div><strong>All pairs found. Nicely done.</strong>
          <p>{game.moves} moves · {formatTime(game.elapsedMs)}. Ready for another round?</p></div>
      </div>}
      <Board key={session.generation} ref={board} game={game} onActivate={session.activate} />
      <div className="board-footer"><p>Same shape. Same marker. A perfect pair.</p>
        <p><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> to move <span>·</span> <kbd>↵</kbd> or Space to reveal</p></div>
      <Reproduction boardCode={game.board.code} generation={session.generation} status={session.status}
        paused={session.paused} onLoadBoard={session.loadBoard} onLoadSnapshot={session.loadSnapshot}
        onExport={session.exportSnapshot} onResume={() => { board.current?.focusRemembered(); session.resume(); }} />
    </section>
    <footer className="page-footer"><span>A little focus goes a long way.</span><span>OFFLINE. UNHURRIED. ALL YOURS.</span></footer>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
  </main>;
}
