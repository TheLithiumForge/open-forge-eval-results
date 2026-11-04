import { useRef } from 'react';
import type { BoardFocus } from './board/Board.tsx';
import { Board } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { formatTime } from './advanceGame.ts';
import { isWon, pairCount } from './state.ts';
import { Status } from './Status.tsx';
import { useSession } from './session/useSession.ts';
import './Game.css';

export function Game() {
  const session = useSession();
  const boardFocus = useRef<BoardFocus>(null);
  const { game } = session;
  const won = isWon(game);
  return <main>
    <header className="game-header">
      <div className="title-row">
        <svg className="brand" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="2" y="2" width="18" height="24" rx="4" fill="none" stroke="#63E7FF" strokeWidth="2" />
          <rect x="12" y="6" width="18" height="24" rx="4" fill="#090B14" stroke="#FF71D6" strokeWidth="2" />
          <path d="m21 12 5 6-5 6-5-6Z" fill="#FF71D6" />
        </svg>
        <h1>Neon Pairs</h1>
      </div>
      <p className="intro">A little focus. A perfect match.</p>
      <p className="help">Reveal two cards. Find every pair in as few moves as you can.</p>
    </header>
    <DealControls size={game.board.size} onNewGame={session.newGame} onRestart={session.restart} />
    <Status moves={game.moves} pairs={pairCount(game)} total={game.board.deck.length / 2}
      elapsedMs={game.elapsedMs} best={session.preferences.bests[game.board.size]} />
    {session.paused && <div className="pause-banner">
      <p>Game paused. Your progress is ready.</p>
      <button type="button" onClick={() => {
        boardFocus.current?.focusRemembered();
        session.resume();
      }}>Resume</button>
    </div>}
    {won && <div className={`win-banner${session.celebrate ? ' celebrate' : ''}`}>
      <strong>All pairs found!</strong>
      <p>{game.moves} moves · {formatTime(game.elapsedMs)}</p>
    </div>}
    <Board ref={boardFocus} key={session.dealId} game={game} onActivate={session.activate} />
    <p className="board-help help">Tap or click to reveal. Use arrow keys to explore, Enter or Space to reveal.</p>
    <Reproduction boardCode={game.board.code} dealId={session.dealId} onLoadBoard={session.loadBoard}
      onLoadSnapshot={session.loadSnapshot} onExportSnapshot={session.exportSnapshot} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      <span key={session.announcement.id}>{session.announcement.text}</span>
    </div>
    <footer className="help">Made for a moment of quiet concentration.</footer>
  </main>;
}
