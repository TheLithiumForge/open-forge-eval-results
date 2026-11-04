import { formatTime, isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before === after || before.selection.kind !== 'one') return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (after.matched.length === before.matched.length) return null;
  if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  const pairs = pairCount(after);
  return pairs === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${pairs} pairs matched.`;
}

export function nextAnnouncement(previous: Announcement, text: string): Announcement {
  return { id: previous.id + 1, text };
}
