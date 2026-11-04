import { formatTime } from '../advanceGame.ts';
import { isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';

export function turnAnnouncement(state: GameState): string {
  if (isWon(state)) return `Pair found. All pairs found in ${state.moves} moves and ${formatTime(state.elapsedMs)}.`;
  if (state.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  const pairs = pairCount(state);
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
