import { useState } from 'react';
import './Controls.css';

interface ReproductionProps {
  code: string;
  generation: number;
  loadBoard: (text: string) => boolean;
  loadSnapshot: (text: string) => string | null;
  exportSnapshot: () => string;
}
export function Reproduction({ code, generation, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [draft, setDraft] = useState({ generation, text: code });
  const [snapshot, setSnapshot] = useState('');
  const [status, setStatus] = useState('');
  if (draft.generation !== generation) setDraft({ generation, text: code });
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="code-controls">
        <input id="board-code" value={draft.text} maxLength={32} spellCheck={false}
          onChange={event => setDraft({ generation, text: event.target.value })} />
        <button type="button" onClick={() => {
          if (loadBoard(draft.text)) setStatus('');
          else setStatus('Invalid board code.');
        }}>Load board</button>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" value={snapshot} rows={6} maxLength={65536} spellCheck={false}
        onChange={event => setSnapshot(event.target.value)} />
      <div className="snapshot-controls">
        <button type="button" onClick={() => { setSnapshot(exportSnapshot()); setStatus(''); }}>Export snapshot</button>
        <button type="button" onClick={() => setStatus(loadSnapshot(snapshot) ?? 'Invalid snapshot.')}>Load snapshot</button>
      </div>
      {status && <p className="load-status">{status}</p>}
    </div>
  </details>;
}
