import type { BoardSize } from '../constants.ts';
import type { GameSession } from '../session/useGameSession.ts';
import './controls.css';

interface ControlsProps {
  readonly session: GameSession;
  readonly size: BoardSize;
}

export function Controls({ session, size }: ControlsProps) {
  return (
    <section className="controls" aria-label="Game controls">
      <div className="deal-controls">
        <label>
          <span>Grid size</span>
          <select value={size} onChange={(event) => session.selectSize(event.currentTarget.value)}>
            {[4, 6, 8, 10, 12, 14, 16].map((side) => <option key={side} value={side}>{side}x{side}</option>)}
          </select>
        </label>
        <button type="button" onClick={session.newGame}>New Game</button>
        <button type="button" onClick={session.restart}>Restart</button>
      </div>
      <details className="reproduction">
        <summary>Reproduce a game</summary>
        <div className="reproduction-body">
          <label>
            <span>Board code</span>
            <div className="field-action">
              <input
                type="text"
                maxLength={32}
                value={session.boardCodeDraft}
                onChange={(event) => session.setBoardCodeDraft(event.currentTarget.value)}
              />
              <button type="button" onClick={session.loadBoard}>Load board</button>
            </div>
          </label>
          <label>
            <span>Snapshot JSON</span>
            <textarea
              maxLength={65536}
              value={session.snapshotDraft}
              onChange={(event) => session.setSnapshotDraft(event.currentTarget.value)}
            />
          </label>
          <div className="snapshot-actions">
            <button type="button" onClick={session.exportSnapshot}>Export snapshot</button>
            <button type="button" onClick={session.loadSnapshot}>Load snapshot</button>
            {session.paused && <button type="button" onClick={session.resume}>Resume</button>}
          </div>
        </div>
      </details>
    </section>
  );
}
