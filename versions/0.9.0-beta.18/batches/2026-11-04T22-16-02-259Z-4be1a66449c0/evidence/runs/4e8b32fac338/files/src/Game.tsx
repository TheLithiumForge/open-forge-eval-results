import { useRef } from 'react';
import { Board } from './game/board/Board';
import type { BoardHandle } from './game/board/Board';
import { DealControls, Reproduction } from './game/controls/Controls';
import { formatTime, isWon } from './game/game';
import { useSession } from './game/session/useSession';
import './Game.css';
export function Game() {
  const session = useSession(), { game } = session, boardRef = useRef<BoardHandle>(null);
  const won = isWon(game), best = session.bests[game.board.size];
  return <main><header><p className="eyebrow">A MEMORY GAME</p><h1>Neon Pairs</h1><p className="intro">Find the pairs. Make every move count.</p></header>
    <DealControls session={session}/>
    <div className="stats" aria-label="Game status"><span>Moves: <strong>{game.moves}</strong></span><span>Pairs: <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></span><span>Time: <strong>{formatTime(game.elapsedMs)}</strong></span><span>Best: <strong>{best ?? 'none'}</strong></span></div>
    {won && <div className={`win ${session.celebrate ? 'celebrate' : ''}`}><strong>All pairs found!</strong> Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</div>}
    {session.paused && <div className="pause">Game paused. <button onClick={() => { boardRef.current?.focus(); session.resume(); }}>Resume</button></div>}
    <Board key={session.deal} game={game} activate={session.activate} boardRef={boardRef}/>
    <p className="hint">Select two cards to find a pair. Use arrow keys to move around the board.</p>
    <Reproduction session={session}/>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{session.announcement}</div>
  </main>;
}
