import { useEffect, useState } from 'react';
import './ReproductionControls.css';

interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly epoch: number;
  readonly status: string;
  readonly onBoard: (text: string) => void;
  readonly onSnapshot: (text: string) => void;
  readonly onExport: () => string;
}

export function ReproductionControls({ boardCode, epoch, status, onBoard, onSnapshot, onExport }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(boardCode); }, [boardCode, epoch]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction__body">
      <p className="help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
      <div className="board-code-controls">
        <div className="board-code-field">
          <label htmlFor="board-code">Board code</label>
          <input id="board-code" type="text" maxLength={32} value={boardDraft} spellCheck={false} autoCapitalize="none"
            onChange={(event) => setBoardDraft(event.currentTarget.value)} />
        </div>
        <button type="button" onClick={() => onBoard(boardDraft)}>Load board</button>
      </div>
      <div className="snapshot-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" maxLength={65536} value={snapshotDraft} spellCheck={false} rows={7}
          onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
      </div>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onSnapshot(snapshotDraft)}>Load snapshot</button>
      </div>
      {status && <p className="reproduction__status">{status}</p>}
    </div>
  </details>;
}
