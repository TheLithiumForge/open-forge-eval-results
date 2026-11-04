import { useEffect, useState } from 'react';
import type { SessionActions } from '../session/sessionTypes.ts';
import './ReproductionControls.css';

interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly revision: number;
  readonly status: string;
  readonly paused: boolean;
  readonly actions: SessionActions;
  readonly onResume: () => void;
}

export function ReproductionControls({ boardCode, revision, status, paused, actions, onResume }: ReproductionControlsProps) {
  const [codeDraft, setCodeDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setCodeDraft(boardCode); }, [boardCode, revision]);

  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Repeat a deal with its board code, or copy a snapshot to save your progress.</p>
      <div className="reproduction-field">
        <label htmlFor="board-code">Board code</label>
        <div className="board-code-controls">
          <input id="board-code" type="text" maxLength={32} value={codeDraft}
            autoCapitalize="off" autoComplete="off" spellCheck={false}
            onChange={event => setCodeDraft(event.currentTarget.value)} />
          <button type="button" onClick={() => { actions.loadBoard(codeDraft); }}>Load board</button>
        </div>
      </div>
      <div className="reproduction-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" rows={8} maxLength={65536} value={snapshotDraft}
          spellCheck={false} onChange={event => setSnapshotDraft(event.currentTarget.value)} />
      </div>
      <div className="snapshot-controls">
        <button type="button" onClick={() => setSnapshotDraft(actions.exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => { actions.loadSnapshot(snapshotDraft); }}>Load snapshot</button>
        {paused && <button type="button" onClick={onResume}>Resume</button>}
      </div>
      {status && <p className="reproduction-status">{status}</p>}
    </div>
  </details>;
}
