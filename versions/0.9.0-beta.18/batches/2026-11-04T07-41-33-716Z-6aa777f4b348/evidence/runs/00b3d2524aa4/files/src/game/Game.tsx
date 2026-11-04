import { useRef, useState } from 'react'
import type { BoardHandle } from './board/Board.tsx'
import { Board } from './board/Board.tsx'
import { DealControls } from './controls/DealControls.tsx'
import { ReproductionControls } from './controls/ReproductionControls.tsx'
import { isWon } from './transitions.ts'
import { formatTime } from './session/time.ts'
import { useGameSession } from './session/useGameSession.ts'
import './Game.css'

type Notice = Readonly<{ version: number; text: string }>

export default function Game() {
  const session = useGameSession()
  const boardRef = useRef<BoardHandle>(null)
  const [boardCode, setBoardCode] = useState(session.game.board.code)
  const [snapshot, setSnapshot] = useState('')
  const [status, setStatus] = useState('')
  const [notice, setNotice] = useState<Notice>({ version: 0, text: '' })
  const won = isWon(session.game)
  const pairs = session.game.matched.length / 2
  const pairTotal = session.game.board.deck.length / 2

  function announce(text: string): void {
    setNotice((previous) => ({ version: previous.version + 1, text }))
  }

  function applyTurn(index: number): void {
    const result = session.activate(index)
    if (result === null) return
    if (result.matched && result.won) {
      announce(`Pair found. All pairs found in ${result.moves} moves and ${result.time}.`)
    } else if (result.matched) {
      announce(`Pair found. ${result.pairs} ${result.pairs === 1 ? 'pair' : 'pairs'} matched.`)
    } else {
      announce('No match. Cards close after a short pause.')
    }
  }

  function newGame(): void {
    setBoardCode(session.startNew())
    setStatus('')
  }

  function restart(): void {
    const code = session.restart()
    if (code !== null) setBoardCode(code)
    setStatus('')
  }

  function changeSize(size: number): void {
    const code = session.chooseSize(size)
    if (code !== null) {
      setBoardCode(code)
      setStatus('')
    }
  }

  function loadBoard(): void {
    const code = session.loadBoard(boardCode)
    if (code === null) {
      setStatus('Invalid board code.')
      announce('Invalid board code.')
      return
    }
    setBoardCode(code)
    setStatus('Board loaded.')
    announce('Board loaded.')
  }

  function exportSnapshot(): void {
    setSnapshot(session.exportSnapshot())
  }

  function loadSnapshot(): void {
    const result = session.loadSnapshot(snapshot)
    if (result.kind === 'invalid') {
      setStatus('Invalid snapshot.')
      announce('Invalid snapshot.')
      return
    }
    setBoardCode(result.boardCode)
    const message = result.kind === 'completed'
      ? 'Loaded completed snapshot.'
      : 'Loaded snapshot. Select Resume to continue.'
    setStatus(message)
    announce(message)
  }

  function resume(): void {
    boardRef.current?.focusRememberedCard()
    session.resume()
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <p className="eyebrow">A little memory goes a long way</p>
        <h1>Neon Pairs</h1>
        <p className="intro">Choose a size, then tap, press Enter or Space to reveal a card. Use arrow keys to move.</p>
      </header>

      <DealControls onNewGame={newGame} onRestart={restart} onSizeChange={changeSize} size={session.size} />

      <section aria-label="Game status" className="game-status">
        <p>Moves: <strong>{session.game.moves}</strong></p>
        <p>Pairs: <strong>{pairs}/{pairTotal}</strong></p>
        <p>Time: <strong>{formatTime(session.game.elapsedMs)}</strong></p>
        <p>Best: <strong>{session.best ?? 'none'}</strong></p>
      </section>

      <div aria-atomic="true" aria-live="polite" className="live-announcement">
        <span key={notice.version}>{notice.text}</span>
      </div>

      {won ? (
        <p className={`win-banner${session.celebrateWin ? ' win-banner--pulse' : ''}`}>
          All pairs found in {session.game.moves} moves and {formatTime(session.game.elapsedMs)}.
        </p>
      ) : null}

      <Board game={session.game} key={session.boardEpoch} onActivate={applyTurn} ref={boardRef} />

      <ReproductionControls
        boardCode={boardCode}
        onBoardCodeChange={setBoardCode}
        onExport={exportSnapshot}
        onLoadBoard={loadBoard}
        onLoadSnapshot={loadSnapshot}
        onResume={resume}
        onSnapshotChange={setSnapshot}
        resumeVisible={session.paused}
        snapshot={snapshot}
        status={status}
      />
    </main>
  )
}
