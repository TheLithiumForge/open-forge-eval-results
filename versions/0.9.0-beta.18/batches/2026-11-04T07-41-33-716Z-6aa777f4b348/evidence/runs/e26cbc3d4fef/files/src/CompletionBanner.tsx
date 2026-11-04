import { formatTime } from './game/format.ts';
import type { GameState } from './game/state.ts';
import './CompletionBanner.css';

export interface CompletionBannerProps {
  readonly game: GameState;
  readonly celebrate: boolean;
}

export function CompletionBanner({ game, celebrate }: CompletionBannerProps) {
  return (
    <section className={`completion-banner${celebrate ? ' completion-banner--pulse' : ''}`}
      aria-label="Game complete">
      <h2>All pairs found!</h2>
      <p>Completed in {game.moves} moves and {formatTime(game.elapsedMs)}.</p>
    </section>
  );
}
