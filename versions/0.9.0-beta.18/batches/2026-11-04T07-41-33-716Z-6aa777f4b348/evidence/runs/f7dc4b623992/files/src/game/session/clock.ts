import { advanceGame } from '../game.ts'
import { CLOSED_SELECTION, freezeState, SELECTION_KIND, type GameState } from '../model.ts'

export function advanceActiveTime(state: GameState, elapsed: number, mismatch: number): GameState {
  if (state.selection.kind !== SELECTION_KIND.mismatch || elapsed === mismatch) return advanceGame(state, elapsed)
  const timerState = advanceGame(state, mismatch)
  const clockState = advanceGame({ ...state, selection: CLOSED_SELECTION }, elapsed)
  return freezeState({ ...clockState, selection: timerState.selection })
}
