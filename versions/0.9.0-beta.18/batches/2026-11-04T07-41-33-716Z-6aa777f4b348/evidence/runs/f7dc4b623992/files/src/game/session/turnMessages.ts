import { formatElapsed, isWon } from '../game.ts'
import type { GameState } from '../model.ts'

export function pairAnnouncement(state: GameState): string {
  if (isWon(state)) return `Pair found. All pairs found in ${state.moves} moves and ${formatElapsed(state.elapsedMs)}.`
  const pairs = state.matched.length / 2
  return pairs === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${pairs} pairs matched.`
}
