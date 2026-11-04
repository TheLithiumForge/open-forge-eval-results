import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduce } from './game/controls/Reproduce.tsx';
import { createGame, formatTime, isWon } from './game/game.ts';
import { useSession } from './game/session/useSession.ts';
import './game.css';
export function Game() {
  const session = useSession(), { game } = session;
  const boardRef = useRef<HTMLDivElement>(null);
  const restart = () => { const next = createGame(game.board.code); if (next) session.replace(next); };
  return <main>
    <header><p className="eyebrow">A MEMORY GAME</p><h1>Neon Pairs</h1><p className="intro">Find the matching pairs. Remember the glow.</p></header>
    <DealControls size={game.board.size} change={size => session.replace(session.fresh(size))} newGame={() => session.replace(session.fresh(game.board.size))} restart={restart}/>
    <section className="scoreboard" aria-label="Game status">
      <span>Moves: <strong>{game.moves}</strong></span><span>Pairs: <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></span>
      <span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span><span>Best: <strong>{session.bests[game.board.size] ?? 'none'}</strong></span>
    </section>
    {isWon(game) && <div className={`win ${session.celebrate ? 'celebrate' : ''}`}><strong>All pairs found!</strong> Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</div>}
    {session.paused && <div className="pause"><span>Game paused.</span><button type="button" onClick={() => { boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(); session.resume(); }}>Resume</button></div>}
    <Board game={game} deal={session.deal} activate={session.activate} boardRef={boardRef}/>
    <p className="help">Choose two cards to find a pair. Use arrow keys to move around the board.</p>
    <Reproduce game={game} deal={session.deal} replace={session.replace} settle={session.settle} announce={session.announce}/>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{session.announcement}</div>
  </main>;
}
