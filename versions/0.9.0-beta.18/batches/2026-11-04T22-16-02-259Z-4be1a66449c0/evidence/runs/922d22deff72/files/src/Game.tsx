import { useRef } from 'react';
import { Board } from './game/board/Board.tsx';
import { DealControls, Reproduction } from './game/controls/Controls.tsx';
import { useSession } from './game/session/useSession.ts';
import { formatTime, isWon } from './game/state.ts';
export function Game() {
  const s = useSession(), boardRef = useRef<HTMLDivElement>(null), game = s.game;
  return <main><header><div className="eyebrow"><span className="signal"/> A MEMORY GAME</div><h1>Neon <span>Pairs</span></h1><p>Find the pairs. Keep your moves low.</p></header>
    <section aria-label="Game controls"><DealControls size={game.board.size} newGame={s.newGame} restart={s.restart}/></section>
    <div className="status-bar" aria-label="Game status"><div><span>Moves:</span> <strong>{game.moves}</strong></div><div><span>Pairs:</span> <strong>{game.matched.length / 2}/{game.board.deck.length / 2}</strong></div><div><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></div><div><span>Best:</span> <strong>{s.best ?? 'none'}</strong></div></div>
    {isWon(game) && <div className={`win ${s.celebrate ? 'celebrate' : ''}`}><strong>All pairs found!</strong> <span>{game.moves} moves · {formatTime(game.elapsedMs)}</span></div>}
    {s.paused && <div className="pause"><span>Game paused</span><button onClick={() => { boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(); s.resume(); }}>Resume</button></div>}
    <Board game={game} generation={s.generation} onActivate={s.activate} boardRef={boardRef}/>
    <p className="hint">Select two cards to find a match. Use arrow keys to move around the board.</p>
    <Reproduction code={game.board.code} generation={s.generation} status={s.status} loadBoard={s.loadBoard} loadSnapshot={s.loadSnapshot} exportSnapshot={s.exportSnapshot}/>
    <div className="sr-only" aria-live="polite" aria-atomic="true">{s.announcement}</div>
  </main>;
}
