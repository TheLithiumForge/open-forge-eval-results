import { useEffect, useState } from 'react';
import './ReproductionControls.css';

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly revision: number;
  readonly status: string;
  readonly onLoadBoard: (draft: string) => boolean;
  readonly onLoadSnapshot: (draft: string) => boolean;
  readonly onExportSnapshot: () => string;
}

export function ReproductionControls(props: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(props.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(props.boardCode); }, [props.boardCode, props.revision]);

  return (
    <details className="reproduction-controls">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <p className="help">A board code repeats a deal. A snapshot saves progress and loads paused.</p>
        <div className="board-code-controls">
          <label className="reproduction-label" htmlFor="board-code">Board code</label>
          <input id="board-code" value={boardDraft} maxLength={32} spellCheck={false}
            autoCapitalize="off" autoComplete="off"
            onChange={(event) => setBoardDraft(event.currentTarget.value)} />
          <button type="button" onClick={() => { props.onLoadBoard(boardDraft); }}>Load board</button>
        </div>
        <label className="reproduction-label" htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" rows={8} maxLength={65536} value={snapshotDraft}
          spellCheck={false} autoCapitalize="off" autoComplete="off"
          onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
        <div className="snapshot-actions">
          <button type="button" onClick={() => setSnapshotDraft(props.onExportSnapshot())}>Export snapshot</button>
          <button type="button" onClick={() => { props.onLoadSnapshot(snapshotDraft); }}>Load snapshot</button>
        </div>
        <p className="load-status">{props.status}</p>
      </div>
    </details>
  );
}
