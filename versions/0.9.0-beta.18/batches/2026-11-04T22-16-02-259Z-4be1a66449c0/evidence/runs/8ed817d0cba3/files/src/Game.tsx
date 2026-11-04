import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls } from './game/controls/DealControls.tsx';
import { Reproduction } from './game/controls/Reproduction.tsx';
import { createGame, formatTime, isWon } from './game/game.ts';
import { useSession } from './game/session/useSession.ts';
export function Game() {
  const session = useSession(), { game } = session, boardRef = useRef<HTMLDivElement>(null);
  const won = isWon(game), best = session.bests[game.board.size];
  return <main><header><p className="eyebrow">A MEMORY GAME</p><h1>Neon Pairs</h1><p className="intro">Find every pair. Make every move count.</p></header>
    <DealControls size={game.board.size} change={size => session.replace(session.fresh(size))} newGame={() => session.replace(session.fresh(game.board.size))} restart={() => { const next = createGame(game.board.code); if (next) session.replace(next); }} />
    <div className="stats"><span>Moves: <strong>{game.moves}</strong></span><span>Pairs: <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></span><span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span><span>Best: <strong>{best ?? 'none'}</strong></span></div>
    {won && <div className={`win ${session.loadedWin ? 'static' : ''}`}><strong>All pairs found!</strong> Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</div>}
    {session.paused && <div className="pause"><span>Game paused</span><button onClick={() => { boardRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus(); session.resume(); }}>Resume</button></div>}
    <Board key={session.generation} game={game} activate={session.activate} boardRef={boardRef} />
    <p className="hint">Use arrow keys to move between cards. Match the shapes, markers and fills.</p>
    <Reproduction game={game} generation={session.generation} sync={session.sync} replace={session.replace} announce={session.announce} />
    <div className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.id}>{session.announcement.text}</span></div>
  </main>;
}
