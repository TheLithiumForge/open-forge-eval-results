import { useEffect, useState } from 'react';
import './Controls.css';

interface ReproductionProps {
  boardCode: string; generation: number; status: string; paused: boolean;
  onLoadBoard: (text: string) => void; onLoadSnapshot: (text: string) => void;
  onExport: () => string; onResume: () => void;
}

export function Reproduction(props: ReproductionProps) {
  const [code, setCode] = useState(props.boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setCode(props.boardCode); }, [props.boardCode, props.generation]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">Share a deal, or save your progress for later.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="input-action">
        <input id="board-code" type="text" maxLength={32} value={code} spellCheck={false}
          onChange={event => setCode(event.target.value)} />
        <button type="button" onClick={() => props.onLoadBoard(code)}>Load board</button>
      </div>
      <label htmlFor="snapshot">Snapshot JSON</label>
      <textarea id="snapshot" maxLength={65536} rows={5} value={snapshot} spellCheck={false}
        placeholder="Export your progress here, or paste a saved snapshot."
        onChange={event => setSnapshot(event.target.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(props.onExport())}>Export snapshot</button>
        <button type="button" onClick={() => props.onLoadSnapshot(snapshot)}>Load snapshot</button>
      </div>
      {props.status && <p className="load-status">{props.status}</p>}
      {props.paused && <button type="button" className="resume" onClick={props.onResume}>Resume</button>}
    </div>
  </details>;
}
