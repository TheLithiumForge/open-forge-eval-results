import { useCallback, useRef, useState } from 'react'
import { activateCard, createGame, isWon } from '../game.ts'
import { isBoardSize, parseBoardCode, type BoardSize } from '../board.ts'
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts'
import { SELECTION_KIND, type GameState } from '../model.ts'
import { freshBoardCode, initialGame } from './deals.ts'
import { recordBest, readBestScores, savePreferredSize, type BestScores } from './storage.ts'
import { pairAnnouncement } from './turnMessages.ts'
import { useAnnouncements } from './useAnnouncements.ts'
import { useActiveClock } from './useActiveClock.ts'

export interface Session {
  state: GameState
  bestScores: BestScores
  revision: number
  paused: boolean
  celebrate: boolean
  status: string
  announcement: string
  newGame(): void
  restart(): void
  chooseSize(size: BoardSize): void
  activate(index: number): void
  loadBoard(code: string): void
  importSnapshot(text: string): void
  exportSnapshot(): string
  resume(): void
  announce(text: string): void
}

export function useSession(): Session {
  const [state, setState] = useState(initialGame)
  const stateRef = useRef(state)
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores)
  const [revision, setRevision] = useState(0)
  const [paused, setPaused] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const pausedRef = useRef(false)
  const [status, setStatus] = useState('')
  const { message, announce, clear } = useAnnouncements()
  const bestAllowed = useRef(true)
  const { flush, commit, replace, beginMismatch, resume: resumeClock } = useActiveClock(stateRef, setState, pausedRef)

  const start = useCallback((code: string): void => {
    const next = createGame(code)
    if (!next) return
    clear()
    pausedRef.current = false
    setPaused(false)
    setCelebrate(false)
    bestAllowed.current = true
    replace(next)
    setRevision((value) => value + 1)
    setStatus('')
  }, [clear, replace])

  const newGame = useCallback(() => {
    const board = stateRef.current.board
    if (isBoardSize(board.size)) start(freshBoardCode(board.size, board.seed))
  }, [start])
  const restart = useCallback(() => start(stateRef.current.board.code), [start])
  const chooseSize = useCallback((size: BoardSize) => {
    if (size === stateRef.current.board.size) return
    savePreferredSize(size)
    start(freshBoardCode(size, stateRef.current.board.seed))
  }, [start])

  const activate = useCallback((index: number): void => {
    const now = performance.now()
    flush(now, true)
    const before = stateRef.current
    if (pausedRef.current) return
    const next = activateCard(before, index)
    if (next === before) return
    commit(next, now)
    if (before.selection.kind !== SELECTION_KIND.mismatch && next.selection.kind === SELECTION_KIND.mismatch) {
      beginMismatch()
    }
    if (before.selection.kind === 'one') announce(next.selection.kind === 'mismatch' ? 'No match. Cards close after a short pause.' : pairAnnouncement(next))
    const finishedSize = next.board.size
    if (!isWon(before) && isWon(next) && bestAllowed.current && isBoardSize(finishedSize)) {
      setBestScores((scores) => recordBest(finishedSize, next.moves, scores))
    }
    if (!isWon(before) && isWon(next)) setCelebrate(true)
  }, [announce, beginMismatch, commit, flush])

  const loadBoard = useCallback((draft: string): void => {
    flush(performance.now(), true)
    const board = parseBoardCode(draft.trim())
    const next = board ? createGame(board.code) : null
    if (!board || !next || !isBoardSize(board.size)) { setStatus('Invalid board code.'); announce('Invalid board code.'); return }
    savePreferredSize(board.size)
    start(board.code)
    setStatus(`Loaded board ${board.code}.`)
    announce(`Loaded board ${board.code}.`)
  }, [announce, flush, start])

  const importSnapshot = useCallback((text: string): void => {
    flush(performance.now(), true)
    const next = decodeSnapshot(text)
    if (!next || !isBoardSize(next.board.size)) { setStatus('Invalid snapshot.'); announce('Invalid snapshot.'); return }
    clear()
    const complete = isWon(next)
    const willPause = !complete
    pausedRef.current = willPause
    setPaused(willPause)
    bestAllowed.current = !complete
    setCelebrate(false)
    replace(next)
    savePreferredSize(next.board.size)
    setRevision((value) => value + 1)
    const textStatus = complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'
    setStatus(textStatus)
    announce(textStatus)
  }, [announce, clear, flush, replace])

  const exportSnapshot = useCallback((): string => {
    flush(performance.now(), true)
    return encodeSnapshot(stateRef.current)
  }, [flush, stateRef])

  const resume = useCallback((): void => {
    pausedRef.current = false
    setPaused(false)
    resumeClock()
    setStatus('')
  }, [resumeClock])

  return { state, bestScores, revision, paused, celebrate, status, announcement: message, newGame, restart, chooseSize, activate, loadBoard, importSnapshot, exportSnapshot, resume, announce }
}
