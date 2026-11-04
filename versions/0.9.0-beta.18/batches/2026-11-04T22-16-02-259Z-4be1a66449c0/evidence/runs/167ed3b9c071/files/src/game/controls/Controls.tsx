import './Controls.css';
import { useEffect, useState } from 'react';
import { sizes } from '../core.ts';
export function DealControls({ size, newGame, restart }: { size: number; newGame: (size?: number) => void; restart: () => void }) {
  return <div className="deal-controls"><label>Grid size <select value={size} onChange={e => newGame(Number(e.target.value))}>{sizes.map(n => <option key={n} value={n}>{n}x{n}</option>)}</select></label><button onClick={() => newGame()}>New Game</button><button onClick={restart}>Restart</button></div>;
}
export function Reproduction({ boardCode, generation, loadBoard, loadSnapshot, exportSnapshot, paused, resume }: { boardCode: string; generation: number; loadBoard: (code: string) => boolean; loadSnapshot: (text: string) => boolean; exportSnapshot: () => string; paused: boolean; resume: () => void }) {
  const [code, setCode] = useState(boardCode), [snapshot, setSnapshot] = useState(''), [status, setStatus] = useState('');
  useEffect(() => { setCode(boardCode); }, [boardCode, generation]);
  return <details><summary>Reproduce a game</summary><div className="reproduction">
    <label>Board code<input value={code} maxLength={32} onChange={e => setCode(e.target.value)}/></label><button onClick={() => setStatus(loadBoard(code) ? 'Loaded board.' : 'Invalid board code.')}>Load board</button>
    <label>Snapshot JSON<textarea value={snapshot} maxLength={65536} rows={5} onChange={e => setSnapshot(e.target.value)}/></label><div className="button-row"><button onClick={() => setSnapshot(exportSnapshot())}>Export snapshot</button><button onClick={() => { const ok = loadSnapshot(snapshot); if (!ok) setStatus('Invalid snapshot.'); else { try { const value: unknown = JSON.parse(snapshot); const matched = typeof value === 'object' && value !== null ? Reflect.get(value, 'matched') : null; const codeValue = typeof value === 'object' && value !== null ? Reflect.get(value, 'boardCode') : ''; const size = typeof codeValue === 'string' ? Number(codeValue.split('-')[1]) : 0; setStatus(Array.isArray(matched) && matched.length === size * size ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); } catch { setStatus('Invalid snapshot.'); } } }}>Load snapshot</button>{paused && <button onClick={resume}>Resume</button>}</div><p className="load-status">{status}</p>
  </div></details>;
}
