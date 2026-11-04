import { isWon, pairCount } from './transition.ts';
import type { GameState } from './types.ts';
import { formatTime } from './timeFormat.ts';
import './StatusPanel.css';

type Props = Readonly<{ game: GameState; best: number | undefined; celebration: number }>;

export function StatusPanel({ game, best, celebration }: Props) {
  const totalPairs = game.board.deck.length / 2;
  const won = isWon(game);
  return <>
    <section className="score-row" aria-label="Game status">
      <div><span>Moves</span><strong>Moves: {game.moves}</strong></div>
      <div><span>Pairs</span><strong>Pairs: {pairCount(game)}/{totalPairs}</strong></div>
      <div><span>Time</span><strong>Time: {formatTime(game.elapsedMs)}</strong></div>
      <div><span>Personal best</span><strong>Best: {best === undefined ? 'none' : best}</strong></div>
    </section>
    {won && <section key={celebration} className={`win-banner${celebration > 0 ? ' win-celebrate' : ''}`} aria-label="Game complete">
      <span className="win-spark" aria-hidden="true">✦</span>
      <div><h2>Beautifully done.</h2><p>All {totalPairs} pairs found in {game.moves} moves and {formatTime(game.elapsedMs)}.</p></div>
      <span className="win-spark" aria-hidden="true">✦</span>
    </section>}
  </>;
}
