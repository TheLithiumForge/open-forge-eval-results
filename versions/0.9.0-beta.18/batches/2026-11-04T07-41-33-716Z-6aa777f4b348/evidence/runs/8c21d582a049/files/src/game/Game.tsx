import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardHandle } from './board/Board.tsx';
import { DealControls } from './controls/DealControls.tsx';
import { ReproductionControls } from './controls/ReproductionControls.tsx';
import { useGameSession } from './session/useGameSession.ts';
import { formatTime, isWon, pairCount } from './state.ts';
import './Game.css';

export function Game() {
  const { view, actions } = useGameSession();
  const board = useRef<BoardHandle | null>(null);
  const { game } = view;
  const resume = () => { board.current?.focusRemembered(); actions.resume(); };

  return <main className="game">
    <header className="game-header">
      <h1>Neon Pairs</h1>
      <p className="help">Find every pair. Remember the shapes, markers and fills.</p>
    </header>
    <DealControls size={game.board.size} actions={actions} />
    <div className="game-status" aria-label="Game statistics">
      <p><span>Moves:</span> <strong>{game.moves}</strong></p>
      <p><span>Pairs:</span> <strong>{pairCount(game)}/{game.board.deck.length / 2}</strong></p>
      <p><span>Time:</span> <strong>{formatTime(game.elapsedMs)}</strong></p>
      <p><span>Best:</span> <strong>{view.best ?? 'none'}</strong></p>
    </div>
    {isWon(game) && <section aria-label="Game complete"
      className={`win-banner${view.celebrate ? ' win-banner--celebrate' : ''}`}>
      <h2>All pairs found!</h2>
      <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </section>}
    <Board key={view.revision} ref={board} game={game} onActivate={actions.activate} />
    <p className="help">Reveal two cards at a time. Use arrow keys to move, Enter or Space to reveal, and Tab to leave the board.</p>
    <ReproductionControls boardCode={game.board.code} revision={view.revision}
      status={view.status} paused={view.paused} actions={actions} onResume={resume} />
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      <span key={view.announcement.id}>{view.announcement.text}</span>
    </div>
  </main>;
}
