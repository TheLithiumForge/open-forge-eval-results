import { formatTime, isWon } from '../model.ts';
import type { GameState } from '../model.ts';

export function turnAnnouncement(state: GameState): string {
  if (state.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (isWon(state)) return `Pair found. All pairs found in ${state.moves} moves and ${formatTime(state.elapsedMs)}.`;
  const pairs = state.matched.length / 2;
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
