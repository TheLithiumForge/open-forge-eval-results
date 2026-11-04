import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls, Reproduction } from './game/controls/Controls.tsx';
import { formatTime, isWon } from './game/core.ts';
import { useSession } from './game/session/useSession.ts';
export function Game() {
  const session = useSession(), boardRef = useRef<HTMLDivElement>(null), { game } = session;
  return <main><header><p className="eyebrow">A LITTLE GAME OF MEMORY</p><h1>Neon Pairs<span>.</span></h1><p className="intro">Find the pairs. Trust your memory.</p></header>
    <DealControls size={game.size} newGame={session.newGame} restart={session.restart}/>
    <section className="stats" aria-label="Game status"><div><span>Moves:</span> <strong>{game.moves}</strong></div><div><span>Pairs:</span> <strong>{game.matched.length / 2}/{game.deck.length / 2}</strong></div><div><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></div><div><span>Best:</span> <strong>{session.best ?? 'none'}</strong></div></section>
    {isWon(game) && <div className={`win ${session.celebrate ? 'pulse' : ''}`}><strong>All pairs found!</strong> Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</div>}
    <Board game={game} generation={session.generation} activate={session.activate} boardRef={boardRef}/>
    <p className="hint">Select two cards to find a match. Use arrow keys to move around the board.</p>
    <Reproduction boardCode={game.boardCode} generation={session.generation} loadBoard={session.loadBoard} loadSnapshot={session.loadSnapshot} exportSnapshot={session.exportSnapshot} paused={session.paused} resume={() => { boardRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus(); session.resume(); }}/>
    <div className="sr-only" aria-live="polite" aria-atomic="true"><span key={session.announcement.id}>{session.announcement.text}</span></div>
  </main>;
}
