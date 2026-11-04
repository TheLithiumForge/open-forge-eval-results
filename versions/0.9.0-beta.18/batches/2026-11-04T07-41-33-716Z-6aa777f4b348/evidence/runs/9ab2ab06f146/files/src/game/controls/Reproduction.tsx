import { useEffect, useState } from 'react';
import './Reproduction.css';

type Props = {
  code: string; generation: number; status: string;
  onBoard: (draft: string) => boolean; onSnapshot: (draft: string) => boolean; onExport: () => string;
};

export function Reproduction({ code, generation, status, onBoard, onSnapshot, onExport }: Props) {
  const [boardDraft, setBoardDraft] = useState(code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(code); }, [code, generation]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p>A board code repeats a deal. A snapshot saves your place.</p>
      <div className="board-code-controls">
        <label htmlFor="board-code">Board code</label>
        <input id="board-code" type="text" value={boardDraft} maxLength={32} spellCheck={false}
          autoCapitalize="off" autoComplete="off" onChange={event => setBoardDraft(event.target.value)} />
        <button type="button" onClick={() => onBoard(boardDraft)}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" value={snapshotDraft} maxLength={65536} spellCheck={false} rows={6}
        onChange={event => setSnapshotDraft(event.target.value)} placeholder="Export your progress, or paste a saved snapshot." />
      <div className="snapshot-buttons">
        <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onSnapshot(snapshotDraft)}>Load snapshot</button>
      </div>
      <p className="load-status">{status}</p>
    </div>
  </details>;
}
