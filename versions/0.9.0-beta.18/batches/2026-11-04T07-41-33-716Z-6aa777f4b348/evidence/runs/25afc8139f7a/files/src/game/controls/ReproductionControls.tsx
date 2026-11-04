import { useEffect, useState } from 'react';
import { SNAPSHOT_BYTE_LIMIT } from '../snapshot.ts';
import './ReproductionControls.css';

type ReproductionControlsProps = Readonly<{
  boardCode: string;
  dealId: number;
  status: string;
  loadBoard: (text: string) => boolean;
  loadSnapshot: (text: string) => boolean;
  exportSnapshot: () => string;
}>;

export function ReproductionControls(props: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(props.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(props.boardCode); }, [props.boardCode, props.dealId]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
      <div className="board-code-controls">
        <div className="reproduction-field">
          <label htmlFor="board-code">Board code</label>
          <input id="board-code" type="text" maxLength={32} spellCheck={false} autoComplete="off"
            value={boardDraft} onChange={(event) => setBoardDraft(event.target.value)} />
        </div>
        <button type="button" onClick={() => { props.loadBoard(boardDraft); }}>Load board</button>
      </div>
      <div className="reproduction-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" maxLength={SNAPSHOT_BYTE_LIMIT} rows={6} spellCheck={false}
          value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.target.value)} />
      </div>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(props.exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => { props.loadSnapshot(snapshotDraft); }}>Load snapshot</button>
      </div>
      {props.status && <p className="reproduction-status">{props.status}</p>}
    </div>
  </details>;
}
