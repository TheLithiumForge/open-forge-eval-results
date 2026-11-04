import { formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before === after || before.selection.kind !== 'one' || after.selection.kind === 'one') return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  const pairs = after.matched.length / 2;
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
