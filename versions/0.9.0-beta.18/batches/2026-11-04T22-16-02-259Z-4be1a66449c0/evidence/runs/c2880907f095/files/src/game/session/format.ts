import { SELECTION } from '../constants';
import { isWon, pairCount } from '../state';
import type { GameState } from '../types';

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function turnResult(previous: GameState, next: GameState): string | null {
  if (next.matched.length > previous.matched.length) {
    return isWon(next)
      ? `Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`
      : pairCount(next) === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${pairCount(next)} pairs matched.`;
  }
  if (next.selection.kind === SELECTION.MISMATCH && previous.selection.kind !== SELECTION.MISMATCH) {
    return 'No match. Cards close after a short pause.';
  }
  return null;
}
