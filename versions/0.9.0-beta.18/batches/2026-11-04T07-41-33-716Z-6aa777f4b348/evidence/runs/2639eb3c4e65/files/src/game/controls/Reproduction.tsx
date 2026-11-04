import { useEffect, useState } from 'react';
import './Reproduction.css';

type ReproductionProps = {
  boardCode: string; revision: number; notice: string;
  loadBoard: (code: string) => void; loadSnapshot: (text: string) => void; exportSnapshot: () => string;
};

export function Reproduction(props: ReproductionProps) {
  const [code, setCode] = useState(props.boardCode);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setCode(props.boardCode); }, [props.boardCode, props.revision]);
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="secondary">A board code repeats a deal. A snapshot saves your progress.</p>
      <label>Board code<input type="text" maxLength={32} value={code} spellCheck={false}
        autoCapitalize="none" autoComplete="off" onChange={event => setCode(event.target.value)} /></label>
      <div><button type="button" onClick={() => props.loadBoard(code)}>Load board</button></div>
      <label>Snapshot JSON<textarea maxLength={65536} value={snapshot} spellCheck={false}
        onChange={event => setSnapshot(event.target.value)} /></label>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(props.exportSnapshot())}>Export snapshot</button>
        <button type="button" onClick={() => props.loadSnapshot(snapshot)}>Load snapshot</button>
      </div>
      {props.notice && <p className="load-status">{props.notice}</p>}
    </div>
  </details>;
}
