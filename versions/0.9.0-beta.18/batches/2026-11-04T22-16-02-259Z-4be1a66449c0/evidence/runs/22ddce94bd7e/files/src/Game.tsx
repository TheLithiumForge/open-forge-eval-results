import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { Controls } from './game/controls/Controls.tsx';
import { useSession } from './game/session/useSession.ts';
import { formatTime, isWon } from './game/state.ts';
export function Game() {
  const session = useSession(), board = useRef<BoardHandle>(null), { game } = session;
  return <main>
    <header><p className="eyebrow">A MEMORY GAME</p><h1>Neon <span>Pairs</span></h1><p className="intro">Find the matching pairs. Make every move count.</p></header>
    <Controls {...session} resume={() => { board.current?.focusTabStop(); session.resume(); }} />
    <div className="status" aria-label="Game status"><span>Moves: <strong>{game.moves}</strong></span><span>Pairs: <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></span><span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span><span>Best: <strong>{session.best ?? 'none'}</strong></span></div>
    {isWon(game) && <div className={`win ${session.celebrate ? 'pulse' : ''}`}><strong>All pairs found!</strong> {game.moves} moves · {formatTime(game.elapsedMs)}</div>}
    <Board ref={board} game={game} generation={session.generation} activate={session.activate} />
    <p className="hint">Pick two cards to find a match. Use arrow keys to move around the board.</p>
    <div className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.serial}>{session.announcement.text}</span></div>
  </main>;
}
