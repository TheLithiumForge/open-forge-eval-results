import { useEffect, useState } from 'react';
import './ReproductionControls.css';

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly generation: number;
  readonly status: string;
  readonly onLoadBoard: (text: string) => void;
  readonly onLoadSnapshot: (text: string) => void;
  readonly onExport: () => string;
}
export function ReproductionControls(props: ReproductionControlsProps) {
  const [boardCode, setBoardCode] = useState(props.boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setBoardCode(props.boardCode); }, [props.boardCode, props.generation]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Repeat a deal with its board code, or save progress with a snapshot.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="board-code-controls">
        <input id="board-code" type="text" maxLength={32} value={boardCode} spellCheck={false}
          onChange={(event) => setBoardCode(event.currentTarget.value)} />
        <button type="button" onClick={(event) => { event.currentTarget.focus(); props.onLoadBoard(boardCode); }}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" rows={8} maxLength={65536} value={snapshot} spellCheck={false}
        onChange={(event) => setSnapshot(event.currentTarget.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={(event) => { event.currentTarget.focus(); setSnapshot(props.onExport()); }}>Export snapshot</button>
        <button type="button" onClick={(event) => { event.currentTarget.focus(); props.onLoadSnapshot(snapshot); }}>Load snapshot</button>
      </div>
      <p className="reproduction-status">{props.status}</p>
    </div>
  </details>;
}
