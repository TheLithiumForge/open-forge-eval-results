import { formatElapsedTime, isWon, matchedPairCount, SELECTION_KIND, type GameState } from '../state.ts';

export interface TurnAnnouncement {
  readonly text: string;
  readonly completed: boolean;
}

export function turnAnnouncement(before: GameState, after: GameState): TurnAnnouncement | null {
  if (before.selection.kind !== SELECTION_KIND.one || after.selection.kind === SELECTION_KIND.one) return null;
  if (after.selection.kind === SELECTION_KIND.mismatch) {
    return { text: 'No match. Cards close after a short pause.', completed: false };
  }
  if (after.matched.length === before.matched.length) return null;
  if (isWon(after)) {
    return {
      text: `Pair found. All pairs found in ${after.moves} moves and ${formatElapsedTime(after.elapsedMs)}.`,
      completed: true,
    };
  }
  const pairs = matchedPairCount(after);
  return { text: `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`, completed: false };
}
