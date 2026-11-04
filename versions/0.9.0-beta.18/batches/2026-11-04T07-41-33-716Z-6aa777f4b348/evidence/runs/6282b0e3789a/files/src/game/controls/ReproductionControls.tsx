import { useEffect, useState } from 'react';
import type { GameSession } from '../session/useGameSession.ts';
import './ReproductionControls.css';

interface ReproductionControlsProps {
  readonly session: GameSession;
  readonly onResume: () => void;
}

export function ReproductionControls({ session, onResume }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(session.game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const code = session.game.board.code;
  useEffect(() => { setBoardDraft(code); }, [session.dealId, code]);

  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-body">
      <p className="reproduction-help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
      <div className="reproduction-field">
        <label htmlFor="board-code">Board code</label>
        <div className="board-load-row">
          <input id="board-code" type="text" maxLength={32} value={boardDraft} autoComplete="off" spellCheck={false}
            onChange={event => setBoardDraft(event.currentTarget.value)} />
          <button type="button" onClick={() => session.loadBoard(boardDraft)}>Load board</button>
        </div>
      </div>
      <div className="reproduction-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" maxLength={65536} rows={6} value={snapshotDraft} spellCheck={false}
          onChange={event => setSnapshotDraft(event.currentTarget.value)} />
        <div className="snapshot-actions">
          <button type="button" onClick={() => setSnapshotDraft(session.exportSnapshot())}>Export snapshot</button>
          <button type="button" onClick={() => session.loadSnapshot(snapshotDraft)}>Load snapshot</button>
          {session.paused && <button type="button" onClick={onResume}>Resume</button>}
        </div>
      </div>
      {session.loadStatus && <p className="load-status">{session.loadStatus}</p>}
    </div>
  </details>;
}
