import { useEffect, useState } from 'react';
import './Reproduction.css';

export type ReproductionProps = Readonly<{
  boardCode: string; dealId: number;
  onLoadBoard(text: string): string; onLoadSnapshot(text: string): string;
  onExportSnapshot(): string;
}>;
export function Reproduction({ boardCode, dealId, onLoadBoard, onLoadSnapshot, onExportSnapshot }: ReproductionProps) {
  const [code, setCode] = useState(boardCode);
  const [snapshot, setSnapshot] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { setCode(boardCode); }, [boardCode, dealId]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-body">
      <p className="help">Share a deal with its board code, or save your place with a snapshot.</p>
      <div className="board-code-control">
        <label htmlFor="board-code">Board code</label>
        <div className="code-row">
          <input id="board-code" type="text" value={code} maxLength={32} autoCapitalize="off" spellCheck={false}
            onChange={event => setCode(event.target.value)} />
          <button type="button" onClick={() => setStatus(onLoadBoard(code))}>Load board</button>
        </div>
      </div>
      <label className="snapshot-control" htmlFor="snapshot-json">Snapshot JSON
        <textarea id="snapshot-json" value={snapshot} maxLength={65536} rows={8} spellCheck={false}
          onChange={event => setSnapshot(event.target.value)} />
      </label>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(onExportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => setStatus(onLoadSnapshot(snapshot))}>Load snapshot</button>
      </div>
      {status && <p className="load-status">{status}</p>}
      <p className="help">Snapshots load paused. Select Resume when you’re ready to play.</p>
    </div>
  </details>;
}
