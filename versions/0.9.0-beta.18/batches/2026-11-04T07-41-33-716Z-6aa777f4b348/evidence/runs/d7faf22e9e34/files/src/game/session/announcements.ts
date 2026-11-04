import { formatTime } from '../formatTime.ts';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';

export interface Announcement { readonly id: number; readonly text: string }

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before.selection.kind !== 'one' || before === after) return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (after.matched.length === before.matched.length) return null;
  if (isWon(after)) {
    return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  }
  const pairs = after.matched.length / 2;
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
