import { formatTime, isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';

export function turnResult(game: GameState): string {
  if (isWon(game)) return `Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`;
  if (game.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  const pairs = pairCount(game);
  return pairs === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${pairs} pairs matched.`;
}
