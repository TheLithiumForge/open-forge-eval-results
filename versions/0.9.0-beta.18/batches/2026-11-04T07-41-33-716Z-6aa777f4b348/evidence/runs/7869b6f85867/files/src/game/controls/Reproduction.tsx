import { useEffect, useState } from 'react';
import './Reproduction.css';

interface ReproductionProps {
  boardCode: string; revision: number; status: string;
  loadBoard: (draft: string) => void; loadSnapshot: (draft: string) => void;
  exportSnapshot: () => string;
}

export function Reproduction({ boardCode, revision, status, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [codeDraft, setCodeDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setCodeDraft(boardCode); }, [boardCode, revision]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="code-controls">
        <input id="board-code" type="text" maxLength={32} spellCheck={false} autoCapitalize="off"
          value={codeDraft} onChange={event => setCodeDraft(event.target.value)} />
        <button type="button" onClick={() => loadBoard(codeDraft)}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" maxLength={65536} rows={7} spellCheck={false}
        value={snapshotDraft} onChange={event => setSnapshotDraft(event.target.value)} />
      <div className="snapshot-controls">
        <button type="button" onClick={() => setSnapshotDraft(exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => loadSnapshot(snapshotDraft)}>Load snapshot</button>
      </div>
      {status && <p className="load-status">{status}</p>}
      <p className="help">Copy the JSON to keep it. Loaded progress waits for Resume.</p>
    </div>
  </details>;
}
