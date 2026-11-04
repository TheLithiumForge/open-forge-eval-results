import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { isWon } from '../game.ts'
import { SELECTION_KIND, type GameState } from '../model.ts'
import { advanceActiveTime } from './clock.ts'
import { cancelMismatchTimer, startMismatchTimer } from './mismatchTimer.ts'

export interface ActiveClock {
  commit(state: GameState, now: number): void
  replace(state: GameState): void
  flush(now: number, force?: boolean): void
  beginMismatch(): void
  resume(): void
}

export function useActiveClock(
  stateRef: MutableRefObject<GameState>,
  setState: Dispatch<SetStateAction<GameState>>,
  pausedRef: MutableRefObject<boolean>,
): ActiveClock {
  const lastTime = useRef(performance.now())
  const elapsedRemainder = useRef(0)
  const mismatchRemainder = useRef(0)
  const mismatchTimer = useRef<number | null>(null)
  const clockRunning = useRef(false)

  const clearTimer = useCallback((): void => {
    cancelMismatchTimer(mismatchTimer.current)
    mismatchTimer.current = null
  }, [])

  const flush = useCallback((now: number, force = false): void => {
    const delta = Math.max(0, now - lastTime.current)
    lastTime.current = now
    if (!clockRunning.current) return
    elapsedRemainder.current += delta
    const current = stateRef.current
    if (current.selection.kind === SELECTION_KIND.mismatch) mismatchRemainder.current += delta
    const mismatchLimit = current.selection.kind === SELECTION_KIND.mismatch
      ? current.selection.remainingMs - mismatchRemainder.current
      : Number.POSITIVE_INFINITY
    if (!force && elapsedRemainder.current < Math.max(1, Math.min(250, mismatchLimit))) return
    const elapsed = Math.floor(elapsedRemainder.current)
    const mismatch = Math.floor(mismatchRemainder.current)
    elapsedRemainder.current -= elapsed
    mismatchRemainder.current -= mismatch
    if (elapsed < 1 && mismatch < 1) return
    const next = advanceActiveTime(current, elapsed, mismatch)
    if (next === current) return
    stateRef.current = next
    const secondChanged = Math.floor(next.elapsedMs / 1_000) !== Math.floor(current.elapsedMs / 1_000)
    const mismatchClosed = current.selection.kind === SELECTION_KIND.mismatch && next.selection.kind !== SELECTION_KIND.mismatch
    if (secondChanged || mismatchClosed) setState(next)
    if (mismatchClosed) {
      mismatchRemainder.current = 0
      clearTimer()
    }
  }, [clearTimer, setState, stateRef])

  const scheduleTimer = useCallback((): void => {
    clearTimer()
    const current = stateRef.current
    if (current.selection.kind !== SELECTION_KIND.mismatch || !clockRunning.current || pausedRef.current || document.hidden) return
    const remaining = current.selection.remainingMs - mismatchRemainder.current
    mismatchTimer.current = startMismatchTimer(remaining, () => {
      mismatchTimer.current = null
      flush(performance.now(), true)
    })
  }, [clearTimer, flush, pausedRef, stateRef])

  const commit = useCallback((next: GameState, now: number): void => {
    stateRef.current = next
    setState(next)
    lastTime.current = now
    clockRunning.current = next.started && !isWon(next) && !pausedRef.current && !document.hidden
    if (isWon(next)) clockRunning.current = false
  }, [pausedRef, setState, stateRef])

  const replace = useCallback((next: GameState): void => {
    clearTimer()
    elapsedRemainder.current = 0
    mismatchRemainder.current = 0
    commit(next, performance.now())
  }, [clearTimer, commit])

  const beginMismatch = useCallback((): void => {
    mismatchRemainder.current = 0
    scheduleTimer()
  }, [scheduleTimer])

  const resume = useCallback((): void => {
    lastTime.current = performance.now()
    clockRunning.current = !document.hidden && stateRef.current.started && !isWon(stateRef.current)
    scheduleTimer()
  }, [scheduleTimer, stateRef])

  useEffect(() => {
    let frame = 0
    const tick = (now: number): void => {
      flush(now)
      frame = requestAnimationFrame(tick)
    }
    const visibilityChanged = (): void => {
      const now = performance.now()
      flush(now, true)
      lastTime.current = now
      clockRunning.current = !document.hidden && !pausedRef.current && stateRef.current.started && !isWon(stateRef.current)
      if (document.hidden) clearTimer()
      else scheduleTimer()
    }
    document.addEventListener('visibilitychange', visibilityChanged)
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibilityChanged); clearTimer() }
  }, [clearTimer, flush, pausedRef, scheduleTimer, stateRef])

  return { commit, replace, flush, beginMismatch, resume }
}
