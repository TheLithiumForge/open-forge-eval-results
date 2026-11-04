import { useState } from 'react';
import './controls.css';

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly revision: number;
  readonly paused: boolean;
  readonly status: string;
  readonly onLoadBoard: (code: string) => boolean;
  readonly onLoadSnapshot: (text: string) => boolean;
  readonly onExportSnapshot: () => string;
  readonly onResume: () => void;
}

export function ReproductionControls(props: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(props.boardCode);
  const [seenRevision, setSeenRevision] = useState(props.revision);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  if (seenRevision !== props.revision) {
    setSeenRevision(props.revision);
    setBoardDraft(props.boardCode);
  }
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help-text">Repeat a deal with its board code, or save your place with a snapshot.</p>
      <div className="board-code-controls">
        <label className="code-field">Board code
          <input value={boardDraft} maxLength={32} autoComplete="off" spellCheck={false}
            onChange={event => setBoardDraft(event.currentTarget.value)} />
        </label>
        <button type="button" onClick={() => props.onLoadBoard(boardDraft)}>Load board</button>
      </div>
      <label className="snapshot-field">Snapshot JSON
        <textarea value={snapshotDraft} maxLength={65536} rows={6} spellCheck={false}
          onChange={event => setSnapshotDraft(event.currentTarget.value)} />
      </label>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(props.onExportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => props.onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
        {props.paused && <button type="button" onClick={props.onResume}>Resume</button>}
      </div>
      {props.status && <p className="load-status">{props.status}</p>}
    </div>
  </details>;
}
