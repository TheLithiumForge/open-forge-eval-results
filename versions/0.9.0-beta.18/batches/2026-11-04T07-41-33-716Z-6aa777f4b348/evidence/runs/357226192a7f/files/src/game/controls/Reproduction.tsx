import { useEffect, useState } from 'react';
import './Reproduction.css';

export type ReproductionProps = Readonly<{
  boardCode: string; dealId: number; status: string;
  onLoadBoard: (draft: string) => boolean;
  onLoadSnapshot: (draft: string) => boolean;
  onExport: () => string;
}>;

export function Reproduction({ boardCode, dealId, status, onLoadBoard, onLoadSnapshot, onExport }: ReproductionProps) {
  const [code, setCode] = useState(boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => setCode(boardCode), [boardCode, dealId]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="code-controls">
        <input id="board-code" type="text" value={code} maxLength={32} spellCheck={false}
          autoCapitalize="off" autoComplete="off" onChange={event => setCode(event.target.value)} />
        <button type="button" onClick={() => onLoadBoard(code)}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" value={snapshot} maxLength={65536} rows={6} spellCheck={false}
        onChange={event => setSnapshot(event.target.value)} />
      <div className="snapshot-buttons">
        <button type="button" onClick={() => setSnapshot(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onLoadSnapshot(snapshot)}>Load snapshot</button>
      </div>
      <p className="load-status">{status}</p>
    </div>
  </details>;
}
