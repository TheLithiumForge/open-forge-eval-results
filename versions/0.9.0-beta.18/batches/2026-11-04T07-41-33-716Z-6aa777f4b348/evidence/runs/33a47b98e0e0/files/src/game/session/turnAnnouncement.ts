import { formatTime, isWon, matchedPairCount, type GameState } from '../state.ts';

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (after.matched.length > before.matched.length) {
    if (isWon(after)) return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
    const pairs = matchedPairCount(after);
    return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
  }
  return after.selection.kind === 'mismatch' ? 'No match. Cards close after a short pause.' : null;
}
