import { useEffect, useState } from 'react';
import './ReproductionControls.css';

interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly dealRevision: number;
  readonly paused: boolean;
  readonly status: string;
  readonly onLoadBoard: (draft: string) => boolean;
  readonly onLoadSnapshot: (draft: string) => boolean;
  readonly onExport: () => string;
  readonly onResume: () => void;
}

export function ReproductionControls({ boardCode, dealRevision, paused, status,
  onLoadBoard, onLoadSnapshot, onExport, onResume }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(boardCode); }, [boardCode, dealRevision]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <div className="board-code-controls">
        <label className="draft-control">Board code
          <input type="text" maxLength={32} value={boardDraft} spellCheck={false}
            autoComplete="off" onChange={(event) => setBoardDraft(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={() => onLoadBoard(boardDraft)}>Load board</button>
      </div>
      <label className="draft-control">Snapshot JSON
        <textarea rows={6} maxLength={65536} value={snapshotDraft} spellCheck={false}
          onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
      </label>
      <p className="reproduction-help">Export your progress to copy and save, or paste a snapshot to continue.</p>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
        {paused && <button type="button" onClick={onResume}>Resume</button>}
      </div>
      {status && <p className="load-status">{status}</p>}
    </div>
  </details>;
}
