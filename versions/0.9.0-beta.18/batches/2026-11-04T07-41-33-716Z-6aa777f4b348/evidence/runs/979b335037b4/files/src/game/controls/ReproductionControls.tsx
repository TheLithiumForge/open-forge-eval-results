import { useEffect, useState } from 'react';
import './ReproductionControls.css';

export type ReproductionControlsProps = {
  boardCode: string; epoch: number; status: string;
  loadBoard: (text: string) => void; loadSnapshot: (text: string) => void;
  exportSnapshot: () => string;
};

export function ReproductionControls(props: ReproductionControlsProps) {
  const [code, setCode] = useState(props.boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setCode(props.boardCode); }, [props.boardCode, props.epoch]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats the deal. A snapshot saves your progress.</p>
      <div className="board-code-row">
        <label htmlFor="board-code">Board code</label>
        <input id="board-code" type="text" maxLength={32} value={code} spellCheck={false}
          autoCapitalize="none" autoComplete="off" onChange={event => setCode(event.target.value)} />
        <button type="button" onClick={() => props.loadBoard(code)}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" maxLength={65536} rows={6} spellCheck={false}
        value={snapshot} onChange={event => setSnapshot(event.target.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(props.exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => props.loadSnapshot(snapshot)}>Load snapshot</button>
      </div>
      {props.status && <p className="load-status">{props.status}</p>}
    </div>
  </details>;
}
