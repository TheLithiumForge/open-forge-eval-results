import type { JSX } from 'react';
import { formatTime, isWon, matchedPairCount, type GameState } from './state.ts';
import './game.css';

export interface GameStatusProps {
  readonly game: GameState;
  readonly best: number | null;
  readonly celebrating: boolean;
}

export function GameStatus({ game, best, celebrating }: GameStatusProps): JSX.Element {
  const totalPairs = game.deck.length / 2;
  const pairs = matchedPairCount(game);
  const won = isWon(game);
  return (
    <>
      <section className="status-readout" aria-label="Game status">
        <p><span className="status-label">Moves: </span><strong>{game.moves}</strong></p>
        <p><span className="status-label">Pairs: </span><strong>{pairs}/{totalPairs}</strong></p>
        <p><span className="status-label">Time: </span><strong>{formatTime(game.elapsedMs)}</strong></p>
        <p><span className="status-label">Best: </span><strong>{best === null ? 'none' : best}</strong></p>
      </section>
      {won && (
        <section className={celebrating ? 'win-banner is-celebrating' : 'win-banner'} aria-label="Game complete">
          <h2>All pairs found!</h2>
          <p>Moves: {game.moves} <span aria-hidden="true">·</span> Time: {formatTime(game.elapsedMs)}</p>
        </section>
      )}
    </>
  );
}

export function TurnAnnouncements({ serial, text }: { readonly serial: number; readonly text: string }): JSX.Element {
  return (
    <div className="screen-reader-output" aria-live="polite" aria-atomic="true">
      {text !== '' && <span key={serial}>{text}</span>}
    </div>
  );
}
