import { useEffect, useState } from 'react';
import './Reproduction.css';

interface ReproductionProps {
  code: string; revision: number;
  loadBoard: (draft: string) => string; loadSnapshot: (draft: string) => string;
  exportSnapshot: () => string;
}

export function Reproduction({ code, revision, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [boardDraft, setBoardDraft] = useState(code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { setBoardDraft(code); }, [code, revision]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats a deal. A snapshot keeps your progress.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="code-row">
        <input id="board-code" type="text" maxLength={32} value={boardDraft} spellCheck={false}
          autoCapitalize="none" onChange={event => setBoardDraft(event.currentTarget.value)} />
        <button type="button" onClick={() => setStatus(loadBoard(boardDraft))}>Load board</button>
      </div>
      <label htmlFor="snapshot">Snapshot JSON</label>
      <textarea id="snapshot" maxLength={65536} value={snapshotDraft} spellCheck={false}
        placeholder="Export your progress here, or paste a saved snapshot."
        onChange={event => setSnapshotDraft(event.currentTarget.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={() => { setSnapshotDraft(exportSnapshot()); setStatus('Snapshot exported.'); }}>Export snapshot</button>
        <button type="button" onClick={() => setStatus(loadSnapshot(snapshotDraft))}>Load snapshot</button>
      </div>
      {status && <p className="reproduction-status">{status}</p>}
    </div>
  </details>;
}
