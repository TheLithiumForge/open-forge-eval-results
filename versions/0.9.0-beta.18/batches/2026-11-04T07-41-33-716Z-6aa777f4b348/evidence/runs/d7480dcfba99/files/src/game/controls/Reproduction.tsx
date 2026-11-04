import { useState } from 'react';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot } from '../snapshot.ts';
import './Reproduction.css';

type Props = {
  initialCode: string; revision: number;
  onLoad: (state: GameState, imported?: boolean) => void;
  onExport: () => string;
  onStatus: (text: string) => void;
};
export function Reproduction({ initialCode, revision, onLoad, onExport, onStatus }: Props) {
  const [code, setCode] = useState(initialCode);
  const [snapshot, setSnapshot] = useState('');
  const [status, setStatus] = useState('');
  // This component stays mounted across deals so drafts survive card and clock renders.
  const [currentRevision, setCurrentRevision] = useState(revision);
  if (currentRevision !== revision) {
    setCurrentRevision(revision);
    setCode(initialCode);
  }
  function report(message: string) { setStatus(message); onStatus(message); }
  function loadBoard() {
    const state = createGame(code.trim());
    if (!state) return report('Invalid board code.');
    setCode(state.board.code);
    setStatus('');
    onLoad(state);
  }
  function loadSnapshot() {
    const state = decodeSnapshot(snapshot);
    if (!state) return report('Invalid snapshot.');
    onLoad(state, true);
    setCode(state.board.code);
    setStatus(state.matched.length === state.board.deck.length
      ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-body">
      <p className="help">Repeat a deal with its board code, or save your place with a snapshot.</p>
      <label htmlFor="board-code">Board code</label>
      <div className="code-row">
        <input id="board-code" maxLength={32} value={code} spellCheck={false} onChange={event => setCode(event.target.value)} />
        <button type="button" onClick={loadBoard}>Load board</button>
      </div>
      <label htmlFor="snapshot">Snapshot JSON</label>
      <textarea id="snapshot" maxLength={65536} rows={6} value={snapshot} spellCheck={false}
        onChange={event => setSnapshot(event.target.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(onExport())}>Export snapshot</button>
        <button type="button" onClick={loadSnapshot}>Load snapshot</button>
      </div>
      {status && <p className="load-status">{status}</p>}
    </div>
  </details>;
}
