import { formatTime } from '../format-time.ts';
import './WinBanner.css';

export interface WinBannerProps {
  readonly moves: number;
  readonly elapsedMs: number;
  readonly celebrate: boolean;
}

export function WinBanner({ moves, elapsedMs, celebrate }: WinBannerProps) {
  return (
    <section className={`win-banner${celebrate ? ' win-banner--celebrate' : ''}`} aria-label="Game complete">
      <h2>All pairs found.</h2>
      <p>Finished in {moves} moves and {formatTime(elapsedMs)}.</p>
    </section>
  );
}
