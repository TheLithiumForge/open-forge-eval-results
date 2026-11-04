import { useEffect, useState } from 'react';
import './controls.css';

type Props = {
  boardCode: string; generation: number; status: string;
  loadBoard: (draft: string) => void; loadSnapshot: (draft: string) => void; exportSnapshot: () => string;
};
export function Reproduction({ boardCode, generation, status, loadBoard, loadSnapshot, exportSnapshot }: Props) {
  const [code, setCode] = useState(boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setCode(boardCode); }, [boardCode, generation]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="secondary">Repeat a deal with its board code, or save your place with a snapshot.</p>
      <div className="board-code-controls">
        <label>Board code<input value={code} maxLength={32} spellCheck={false} onChange={event => setCode(event.target.value)} /></label>
        <button type="button" onClick={() => loadBoard(code)}>Load board</button>
      </div>
      <label>Snapshot JSON<textarea value={snapshot} maxLength={65536} rows={5} spellCheck={false}
        onChange={event => setSnapshot(event.target.value)} /></label>
      <div className="snapshot-buttons">
        <button type="button" onClick={() => setSnapshot(exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => loadSnapshot(snapshot)}>Load snapshot</button>
      </div>
      {status && <p className="load-status">{status}</p>}
    </div>
  </details>;
}
