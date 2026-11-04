import { formatTime } from './state.ts';
import type { GameState } from './state.ts';
import './WinBanner.css';

export interface WinBannerProps {
  game: GameState;
  celebrate: boolean;
}

export function WinBanner({ game, celebrate }: WinBannerProps) {
  return <section className={`win-banner${celebrate ? ' win-banner--celebrate' : ''}`}
    aria-label="Game complete">
    <h2>All pairs found!</h2>
    <p>Finished in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
  </section>;
}
