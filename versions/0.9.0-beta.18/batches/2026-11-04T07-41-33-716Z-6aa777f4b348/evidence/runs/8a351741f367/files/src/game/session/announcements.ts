import { isWon, pairCount } from '../state.ts';
import type { GameState } from '../state.ts';
import { formatTime } from '../transitions.ts';

export interface Announcement { readonly id: number; readonly text: string }

export function turnAnnouncement(game: GameState): string {
  if (game.selection.kind === 'mismatch') return 'No match. Cards close after a short pause.';
  if (isWon(game)) return `Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`;
  const pairs = pairCount(game);
  return `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
}
