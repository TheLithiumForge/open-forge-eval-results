import { isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';
import { formatTime } from '../time.ts';

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before === after || before.selection.kind !== 'one') return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (pairCount(after) === pairCount(before)) return null;
  if (isWon(after)) {
    return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  }
  const count = pairCount(after);
  return `Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`;
}
