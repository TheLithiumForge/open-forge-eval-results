import { useCallback, useRef } from 'react'
import { isBoardSize } from './board.ts'
import { isWon, formatElapsed } from './game.ts'
import { Board } from './board/Board.tsx'
import { DealControls } from './controls/DealControls.tsx'
import { ReproductionControls } from './controls/ReproductionControls.tsx'
import { useSession } from './session/useSession.ts'

export function Game() {
  const session = useSession()
  const focusBoard = useRef<(() => void) | null>(null)
  const exposeFocus = useCallback((focus: () => void): void => { focusBoard.current = focus }, [])
  const won = isWon(session.state)
  const side = isBoardSize(session.state.board.size) ? session.state.board.size : 4
  const best = session.bestScores[side]

  const resume = (): void => {
    focusBoard.current?.()
    session.resume()
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <h1>Neon Pairs</h1>
        <p>Find every matching pair in as few moves as you can.</p>
      </header>
      <DealControls size={side} onSizeChange={session.chooseSize} onNewGame={session.newGame} onRestart={session.restart} />
      <section className="game-status" aria-label="Game status">
        <p><span className="status-label">Moves:</span> {session.state.moves}</p>
        <p><span className="status-label">Pairs:</span> {session.state.matched.length / 2}/{session.state.deck.length / 2}</p>
        <p><span className="status-label">Time:</span> {formatElapsed(session.state.elapsedMs)}</p>
        <p><span className="status-label">Best:</span> {best === undefined ? 'none' : best}</p>
      </section>
      {won && <div className={`win-banner${session.celebrate ? ' celebrate' : ' static'}`}>
        <strong>Every pair found!</strong>
        <span>Final moves: {session.state.moves} · Time: {formatElapsed(session.state.elapsedMs)}</span>
      </div>}
      <div className="live-announcement" role="status" aria-live="polite" aria-atomic="true">{session.announcement}</div>
      <Board state={session.state} resetFocus={session.revision} onActivate={session.activate} onExposeFocus={exposeFocus} />
      <ReproductionControls
        boardCode={session.state.board.code}
        revision={session.revision}
        paused={session.paused}
        status={session.status}
        onLoadBoard={session.loadBoard}
        onExport={session.exportSnapshot}
        onLoadSnapshot={session.importSnapshot}
        onResume={resume}
      />
    </main>
  )
}
