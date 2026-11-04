import { useEffect, useState } from 'react';
import './ReproductionControls.css';

type ReproductionControlsProps = Readonly<{
  boardCode: string; dealId: number; paused: boolean;
  boardStatus: string; snapshotStatus: string;
  onLoadBoard: (text: string) => string; onLoadSnapshot: (text: string) => string;
  onExport: () => string; onResume: () => void;
}>;

export function ReproductionControls({ boardCode, dealId, paused, onLoadBoard,
  onLoadSnapshot, onExport, onResume, boardStatus, snapshotStatus }: ReproductionControlsProps) {
  const [codeDraft, setCodeDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setCodeDraft(boardCode); }, [boardCode, dealId]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
      <div className="board-code-controls">
        <label htmlFor="board-code">Board code</label>
        <input id="board-code" type="text" value={codeDraft} maxLength={32}
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={(event) => setCodeDraft(event.currentTarget.value)} />
        <button type="button" onClick={() => onLoadBoard(codeDraft)}>Load board</button>
      </div>
      {boardStatus && <p className="reproduction-status">{boardStatus}</p>}
      <label className="snapshot-label" htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" rows={7} maxLength={65536} value={snapshotDraft} spellCheck={false}
        onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
        {paused && <button type="button" onClick={onResume}>Resume</button>}
      </div>
      {snapshotStatus && <p className="reproduction-status">{snapshotStatus}</p>}
    </div>
  </details>;
}
