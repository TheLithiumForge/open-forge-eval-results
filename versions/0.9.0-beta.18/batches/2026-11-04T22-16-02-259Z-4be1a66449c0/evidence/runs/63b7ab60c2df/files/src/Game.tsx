import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { Controls } from './game/controls/Controls.tsx';
import { formatTime, isWon } from './game/game.ts';
import { useSession } from './game/session/useSession.ts';
export function Game() {
  const session = useSession(); const { game } = session; const boardRef = useRef<HTMLDivElement>(null);
  return <main><header><p className="eyebrow">A MEMORY GAME</p><h1>Neon Pairs</h1><p className="intro">Find the matching pairs. Take your time, trust your memory.</p></header>
    <Controls {...session} boardRef={boardRef}/>
    <div className="status" aria-label="Game status"><span>Moves: {game.moves}</span><span>Pairs: {game.matched.length / 2}/{game.deck.length / 2}</span><span>Time: {formatTime(game.elapsedMs)}</span><span>Best: {session.bests[game.size] ?? 'none'}</span></div>
    {isWon(game) && <div className={`win ${session.celebrate ? 'celebrate' : ''}`}><strong>All pairs found!</strong> {game.moves} moves · {formatTime(game.elapsedMs)}</div>}
    <Board game={game} generation={session.generation} activate={session.activate} boardRef={boardRef}/>
    <p className="help">Reveal two cards to find a pair. Use arrow keys to move around the board.</p>
    <div className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.id}>{session.announcement.text}</span></div>
  </main>;
}
