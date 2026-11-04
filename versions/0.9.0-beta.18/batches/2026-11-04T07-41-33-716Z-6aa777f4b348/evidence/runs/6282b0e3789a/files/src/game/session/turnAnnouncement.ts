import { formatTime } from '../formatTime.ts';
import { isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before.selection.kind !== 'one' || after === before || after.selection.kind === 'one') return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  const pairs = pairCount(after);
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
