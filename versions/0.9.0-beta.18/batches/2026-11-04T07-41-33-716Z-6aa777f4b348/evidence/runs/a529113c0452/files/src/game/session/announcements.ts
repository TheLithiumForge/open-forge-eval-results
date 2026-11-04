import { formatTime, isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';

export type Announcement = Readonly<{ id: number; text: string }>;

export function announce(previous: Announcement, text: string): Announcement {
  return { id: previous.id + 1, text };
}

export function turnResult(before: GameState, after: GameState): string | null {
  if (before.selection.kind !== 'one' || after === before || after.selection.kind === 'one') return null;
  if (after.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  const count = pairCount(after);
  return count === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${count} pairs matched.`;
}
