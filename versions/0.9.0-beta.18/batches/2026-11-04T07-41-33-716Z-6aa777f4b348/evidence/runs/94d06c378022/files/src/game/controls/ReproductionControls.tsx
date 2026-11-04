import { useEffect, useState } from 'react';
import type { GameSession } from '../session/sessionTypes.ts';
import './controls.css';

interface ReproductionControlsProps {
  readonly session: GameSession;
}

export function ReproductionControls({ session }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(session.game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');

  useEffect(() => {
    setBoardDraft(session.game.board.code);
  }, [session.dealId, session.game.board.code]);

  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <div className="reproduction-row">
          <label className="field-label" htmlFor="board-code">Board code</label>
          <input
            id="board-code"
            type="text"
            maxLength={32}
            value={boardDraft}
            onChange={(event) => setBoardDraft(event.currentTarget.value)}
          />
          <button className="button" type="button" onClick={() => session.loadBoard(boardDraft)}>Load board</button>
        </div>

        <div className="reproduction-row snapshot-row">
          <label className="field-label" htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65_536}
            rows={5}
            value={snapshotDraft}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
          />
          <div className="snapshot-actions">
            <button className="button" type="button" onClick={() => setSnapshotDraft(session.exportSnapshot())}>Export snapshot</button>
            <button className="button" type="button" onClick={() => session.loadSnapshot(snapshotDraft)}>Load snapshot</button>
          </div>
        </div>
        {session.paused ? (
          <div className="resume-note">
            <button className="button button-primary" type="button" onClick={session.resume}>Resume</button>
          </div>
        ) : null}
        <p className="control-status">{session.status || ' '}</p>
      </div>
    </details>
  );
}
