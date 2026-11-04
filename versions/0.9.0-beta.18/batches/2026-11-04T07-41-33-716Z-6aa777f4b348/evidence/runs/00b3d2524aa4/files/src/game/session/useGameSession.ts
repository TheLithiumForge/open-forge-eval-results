import { useCallback, useEffect, useRef, useState } from 'react'
import { isBoardSize } from '../board.ts'
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts'
import { activateCard, advanceGame, createGame, isWon } from '../transitions.ts'
import type { BoardSize, GameState } from '../model.ts'
import { freshGame } from './deal.ts'
import { formatTime } from './time.ts'
import { readPreferences, withBest, withSize, writePreferences, type SavedPreferences } from './storage.ts'

export type TurnResult = Readonly<{ matched: boolean; pairs: number; moves: number; time: string; won: boolean }>
export type SnapshotLoad = Readonly<{ kind: 'invalid' }> | Readonly<{ kind: 'unfinished' | 'completed'; boardCode: string }>

type ClockTracker = { lastMs: number; fraction: number; generation: number }

export function useGameSession() {
  const [preferences, setPreferences] = useState(readPreferences)
  const preferenceRef = useRef(preferences)
  const [game, setGame] = useState(() => freshGame(preferences.size))
  const gameRef = useRef(game)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const visibleRef = useRef(visible)
  const [celebrateWin, setCelebrateWin] = useState(false)
  const [boardEpoch, setBoardEpoch] = useState(0)
  const clock = useRef<ClockTracker>({ lastMs: performance.now(), fraction: 0, generation: 0 })
  const currentGame = gameRef.current
  if (currentGame === null) throw new Error('Game session is not initialized')

  const flushClock = useCallback((now = performance.now()): GameState => {
    const current = gameRef.current
    if (current === null) throw new Error('Game session is not initialized')
    if (!visibleRef.current || pausedRef.current || !current.started || isWon(current)) {
      clock.current.lastMs = now
      clock.current.fraction = 0
      return current
    }
    const elapsed = Math.max(0, now - clock.current.lastMs) + clock.current.fraction
    const milliseconds = Math.floor(elapsed)
    clock.current.lastMs = now
    clock.current.fraction = elapsed - milliseconds
    if (milliseconds === 0) return current
    const advanced = advanceGame(current, milliseconds)
    gameRef.current = advanced
    setGame(advanced)
    return advanced
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState !== 'hidden'
      if (visibleRef.current === nextVisible) return
      if (!nextVisible) flushClock()
      else {
        clock.current.lastMs = performance.now()
      }
      visibleRef.current = nextVisible
      setVisible(nextVisible)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [flushClock])

  const running = game.started && !isWon(game) && !paused && visible
  const hasMismatch = game.selection.kind === 'mismatch'
  useEffect(() => {
    if (!running) return
    let cancelled = false
    let timer = 0
    const generation = ++clock.current.generation
    const schedule = (delay: number) => {
      timer = window.setTimeout(tick, delay)
    }
    const tick = () => {
      if (cancelled || clock.current.generation !== generation) return
      const advanced = flushClock()
      const delay = advanced.selection.kind === 'mismatch'
        ? Math.min(100, advanced.selection.remainingMs)
        : 100
      schedule(delay)
    }
    const current = gameRef.current
    const delay = current?.selection.kind === 'mismatch'
      ? Math.min(100, current.selection.remainingMs)
      : 100
    schedule(delay)
    return () => {
      cancelled = true
      clock.current.generation += 1
      window.clearTimeout(timer)
    }
  }, [running, hasMismatch, boardEpoch, flushClock])

  function save(next: SavedPreferences): void {
    preferenceRef.current = next
    setPreferences(next)
    writePreferences(next)
  }

  function replace(next: GameState, shouldPause: boolean, persistSize: boolean): void {
    clock.current.generation += 1
    clock.current.lastMs = performance.now()
    clock.current.fraction = 0
    gameRef.current = next
    setGame(next)
    pausedRef.current = shouldPause
    setPaused(shouldPause)
    setCelebrateWin(false)
    setBoardEpoch((epoch) => epoch + 1)
    if (persistSize) save(withSize(preferenceRef.current ?? preferences, next.board.size))
  }

  function startNew(size: BoardSize = currentGame.board.size): string {
    const latest = gameRef.current
    const next = freshGame(size, latest?.board.code)
    replace(next, false, true)
    return next.board.code
  }

  function chooseSize(size: number): string | null {
    return isBoardSize(size) && size !== currentGame.board.size ? startNew(size) : null
  }

  function restart(): string | null {
    const latest = gameRef.current
    if (latest === null) return null
    const restarted = createGame(latest.board.code)
    if (restarted !== null) replace(restarted, false, false)
    return restarted?.board.code ?? null
  }

  function loadBoard(code: string): string | null {
    const loaded = createGame(code.trim())
    if (loaded === null) return null
    replace(loaded, false, true)
    return loaded.board.code
  }

  function loadSnapshot(text: string): SnapshotLoad {
    const loaded = decodeSnapshot(text)
    if (loaded === null) return { kind: 'invalid' }
    const completed = isWon(loaded)
    replace(loaded, !completed, true)
    return { kind: completed ? 'completed' : 'unfinished', boardCode: loaded.board.code }
  }

  function resume(): void {
    if (!pausedRef.current) return
    clock.current.lastMs = performance.now()
    clock.current.fraction = 0
    pausedRef.current = false
    setPaused(false)
  }

  function activate(index: number): TurnResult | null {
    if (!visibleRef.current || pausedRef.current) return null
    const before = flushClock()
    const after = activateCard(before, index)
    if (after === before) return null
    gameRef.current = after
    setGame(after)
    const matched = after.matched.length > before.matched.length
    const missed = before.selection.kind === 'one' && after.selection.kind === 'mismatch'
    if (!matched && !missed) return null
    const won = !isWon(before) && isWon(after)
    if (won) {
      setCelebrateWin(true)
      const saved = preferenceRef.current ?? preferences
      save(withBest(saved, after.board.size, after.moves))
    }
    return { matched, pairs: after.matched.length / 2, moves: after.moves, time: formatTime(after.elapsedMs), won }
  }

  function exportSnapshot(): string {
    const now = performance.now()
    const current = gameRef.current
    if (current === null) throw new Error('Game session is not initialized')
    let snapshotState = current
    if (current.started && visibleRef.current && !pausedRef.current && !isWon(current)) {
      const elapsed = Math.max(0, now - clock.current.lastMs) + clock.current.fraction
      snapshotState = advanceGame(current, Math.floor(elapsed))
    }
    return encodeSnapshot(snapshotState, true)
  }

  const best = preferences.bests[game.board.size]
  return { game, size: game.board.size, best, paused, celebrateWin, boardEpoch, startNew, chooseSize, restart, loadBoard, loadSnapshot, resume, activate, exportSnapshot }
}
