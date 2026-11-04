import type { GameState } from '../state.ts';
import { isWon } from '../transitions.ts';
import { formatElapsed } from './activeClock.ts';

export function turnResult(before: GameState, after: GameState): string | null {
  if (before.selection.kind !== 'one') return null;
  const matchedAnotherPair = after.matched.length > before.matched.length;
  const startedMismatch = after.selection.kind === 'mismatch';
  if (!matchedAnotherPair && !startedMismatch) return null;
  const won = isWon(after);
  const pairs = after.matched.length / 2;
  if (won) return `Pair found. All pairs found in ${after.moves} moves and ${formatElapsed(after.elapsedMs)}.`;
  if (matchedAnotherPair) {
    return pairs === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${pairs} pairs matched.`;
  }
  return 'No match. Cards close after a short pause.';
}
