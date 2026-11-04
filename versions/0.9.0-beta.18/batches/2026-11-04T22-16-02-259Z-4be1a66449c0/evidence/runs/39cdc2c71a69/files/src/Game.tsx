import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { Controls } from './game/controls/Controls.tsx';
import { formatTime, isWon } from './game/game.ts';
import { useSession } from './game/session/useSession.ts';
import './game.css';
export function Game() {
  const session = useSession(), { game } = session, boardRef = useRef<HTMLDivElement>(null);
  function resume() { boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(); session.resume(); }
  return <main><header><p className="eyebrow">A MEMORY GAME</p><h1>Neon Pairs</h1><p className="intro">Find every pair. Take your time, and make each move count.</p></header>
    <Controls game={game} deal={session.deal} paused={session.paused} replace={session.replace} fresh={session.fresh} sync={session.sync} announce={session.announce} resume={resume}/>
    <section className="play" aria-label="Game"><div className="stats"><span>Moves: <strong>{game.moves}</strong></span><span>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></span><span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span><span>Best: <strong>{session.best ?? 'none'}</strong></span></div>
      {isWon(game) && <div className={`win ${session.celebrate ? 'celebrate' : ''}`}><strong>All pairs found!</strong> Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</div>}
      <Board game={game} deal={session.deal} activate={session.activate} boardRef={boardRef}/><p className="hint">Choose a card to reveal it. Use arrow keys to move around the board.</p>
    </section><div className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.id}>{session.announcement.text}</span></div>
  </main>;
}
