import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import type { BoardHandle } from './game/board/Board.tsx';
import { DealControls, Reproduction } from './game/controls/Controls.tsx';
import { formatTime, isWon } from './game/game.ts';
import { useGame } from './game/session/useGame.ts';
import './Game.css';
export function Game() {
  const session = useGame(); const board = useRef<BoardHandle>(null); const { game } = session;
  return <main><header><h1>Neon Pairs</h1><p>Find every matching pair in as few moves as you can.</p></header>
    <DealControls game={game} newGame={session.newGame} restart={session.restart} />
    <div className="stats"><span>Moves: {game.moves}</span><span>Pairs: {game.matched.length / 2}/{game.deck.length / 2}</span><span>Time: {formatTime(game.elapsedMs)}</span><span>Best: {session.best ?? 'none'}</span></div>
    {isWon(game) && <div className={`win${session.pulse ? ' pulse' : ''}`}>All pairs found! {game.moves} moves · {formatTime(game.elapsedMs)}</div>}
    <Board key={session.generation} ref={board} game={game} onActivate={session.activate} />
    <Reproduction game={game} generation={session.generation} paused={session.paused} replace={session.replace} sync={session.sync} announce={session.announce} resume={() => { board.current?.focusRemembered(); session.resume(); }} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{session.announcement}</div>
  </main>;
}
