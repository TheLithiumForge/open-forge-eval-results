import { useEffect, useState } from 'react';
import './Reproduction.css';

export interface ReproductionProps {
  readonly boardCode: string;
  readonly deal: number;
  readonly loadBoard: (draft: string) => boolean;
  readonly loadSnapshot: (draft: string) => string;
  readonly exportSnapshot: () => string;
}
export function Reproduction({ boardCode, deal, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [code, setCode] = useState(boardCode);
  const [snapshot, setSnapshot] = useState('');
  const [boardStatus, setBoardStatus] = useState('');
  const [snapshotStatus, setSnapshotStatus] = useState('');
  useEffect(() => { setCode(boardCode); }, [boardCode, deal]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-body">
      <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
      <div className="board-code-tools">
        <label>Board code<input type="text" maxLength={32} value={code} spellCheck={false}
          autoComplete="off" onChange={(event) => setCode(event.target.value)} /></label>
        <button type="button" onClick={() => {
          setBoardStatus(loadBoard(code) ? 'Loaded board.' : 'Invalid board code.');
        }}>Load board</button>
      </div>
      <p className="control-status">{boardStatus}</p>
      <div className="snapshot-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" maxLength={65536} value={snapshot} spellCheck={false}
          onChange={(event) => setSnapshot(event.target.value)} rows={6} />
      </div>
      <div className="snapshot-buttons">
        <button type="button" onClick={() => setSnapshot(exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => setSnapshotStatus(loadSnapshot(snapshot))}>Load snapshot</button>
      </div>
      <p className="control-status">{snapshotStatus}</p>
      <p className="help">Copy the JSON to keep it. Unfinished snapshots load paused.</p>
    </div>
  </details>;
}
