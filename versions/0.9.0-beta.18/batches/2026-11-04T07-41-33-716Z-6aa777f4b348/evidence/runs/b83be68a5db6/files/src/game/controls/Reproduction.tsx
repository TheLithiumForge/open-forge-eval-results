import { useEffect, useState } from 'react';
import './Reproduction.css';

interface ReproductionProps {
  code: string;
  status: string;
  onBoard(text: string): void;
  onSnapshot(text: string): void;
  onExport(): string;
}

function BoardCode({ code, revision, onLoad }: { code: string; revision: number; onLoad(text: string): void }) {
  const [draft, setDraft] = useState(code);
  useEffect(() => { setDraft(code); }, [code, revision]);
  return <div className="board-code-row">
    <label className="code-label">Board code
      <input type="text" value={draft} maxLength={32} spellCheck={false} autoComplete="off"
        onChange={event => setDraft(event.target.value)} />
    </label>
    <button type="button" onClick={() => onLoad(draft)}>Load board</button>
  </div>;
}

export function Reproduction(props: ReproductionProps & { revision: number }) {
  const [snapshot, setSnapshot] = useState('');
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
      <BoardCode code={props.code} revision={props.revision} onLoad={props.onBoard} />
      <label className="snapshot-label">Snapshot JSON
        <textarea value={snapshot} maxLength={65536} rows={5} spellCheck={false}
          onChange={event => setSnapshot(event.target.value)} />
      </label>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(props.onExport())}>Export snapshot</button>
        <button type="button" onClick={() => props.onSnapshot(snapshot)}>Load snapshot</button>
      </div>
      {props.status && <p className="load-status">{props.status}</p>}
    </div>
  </details>;
}
