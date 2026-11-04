import { useEffect, useState } from 'react';
import './ReproductionControls.css';

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly revision: number;
  readonly status: string;
  readonly paused: boolean;
  readonly onLoadBoard: (text: string) => boolean;
  readonly onLoadSnapshot: (text: string) => boolean;
  readonly onExport: () => string;
  readonly onResume: () => void;
}

export function ReproductionControls(props: ReproductionControlsProps) {
  const { boardCode, revision, status, paused, onLoadBoard, onLoadSnapshot, onExport, onResume } = props;
  const [codeDraft, setCodeDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => setCodeDraft(boardCode), [boardCode, revision]);
  return (
    <details className="reproduction">
      <summary>Reproduce a game</summary>
      <div className="reproduction-body">
        <p className="help">A board code repeats the deal. A snapshot saves your progress.</p>
        <div className="board-code-controls">
          <label htmlFor="board-code">Board code</label>
          <input id="board-code" type="text" value={codeDraft} maxLength={32} autoCapitalize="none"
            autoCorrect="off" spellCheck={false} onChange={(event) => setCodeDraft(event.currentTarget.value)} />
          <button type="button" onClick={() => onLoadBoard(codeDraft)}>Load board</button>
        </div>
        <div className="snapshot-controls">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea id="snapshot-json" value={snapshotDraft} maxLength={65536} rows={6} spellCheck={false}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
          <div className="snapshot-actions">
            <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
            <button type="button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
            {paused && <button type="button" className="resume" onClick={onResume}>Resume</button>}
          </div>
        </div>
        {status && <p className="reproduction-status">{status}</p>}
      </div>
    </details>
  );
}
