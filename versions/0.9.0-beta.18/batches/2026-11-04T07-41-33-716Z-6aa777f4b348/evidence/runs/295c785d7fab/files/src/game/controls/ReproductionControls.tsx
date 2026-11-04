import { useEffect, useState } from 'react';
import './controls.css';

type ReproductionProps = Readonly<{
  boardCode: string; revision: number; notice: string;
  loadBoard: (text: string) => boolean; loadSnapshot: (text: string) => boolean;
  exportSnapshot: () => string;
}>;

export function ReproductionControls({ boardCode, revision, notice, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(boardCode); }, [boardCode, revision]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
      <div className="board-code-controls">
        <div className="board-code-field">
          <label htmlFor="board-code">Board code</label>
          <input id="board-code" type="text" value={boardDraft} maxLength={32} spellCheck={false}
            onChange={event => setBoardDraft(event.currentTarget.value)} />
        </div>
        <button type="button" onClick={() => loadBoard(boardDraft)}>Load board</button>
      </div>
      <div className="snapshot-editor">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" value={snapshotDraft} maxLength={65536} rows={7} spellCheck={false}
          onChange={event => setSnapshotDraft(event.currentTarget.value)} />
      </div>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => loadSnapshot(snapshotDraft)}>Load snapshot</button>
      </div>
      {notice && <p className="load-notice">{notice}</p>}
    </div>
  </details>;
}
