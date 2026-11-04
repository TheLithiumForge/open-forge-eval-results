import { KIND, formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (after === before) return null;
  if (after.matched.length > before.matched.length) {
    if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
    const count = after.matched.length / 2;
    return `Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`;
  }
  return after.selection.kind === KIND.mismatch
    ? 'No match. Cards close after a short pause.' : null;
}
