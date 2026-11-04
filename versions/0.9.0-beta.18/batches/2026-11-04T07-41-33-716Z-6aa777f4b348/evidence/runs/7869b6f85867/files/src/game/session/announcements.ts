import { formatTime, isWon, KIND } from '../state.ts';
import type { GameState } from '../state.ts';

export interface Announcement { id: number; text: string }
export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before === after || before.selection.kind !== KIND.one || after.selection.kind === KIND.one) return null;
  if (after.selection.kind === KIND.mismatch) return 'No match. Cards close after a short pause.';
  if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
  const pairs = after.matched.length / 2;
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
