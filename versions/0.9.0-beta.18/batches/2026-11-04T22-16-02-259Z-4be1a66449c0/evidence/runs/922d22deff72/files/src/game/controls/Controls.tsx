import './Controls.css';
import { useEffect, useState } from 'react';
import { sizes, isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
interface DealProps { size: Size; newGame: (size: Size) => void; restart: () => void }
export function DealControls({ size, newGame, restart }: DealProps) {
  return <div className="deal-controls"><label>Grid size<select value={size} onChange={e => { const value = Number(e.target.value); if (isSize(value)) newGame(value); }}>{sizes.map(n => <option value={n} key={n}>{n}x{n}</option>)}</select></label><button onClick={() => newGame(size)}>New Game</button><button onClick={restart}>Restart</button></div>;
}
interface ReproductionProps { code: string; generation: number; status: string; loadBoard: (code: string) => boolean; loadSnapshot: (text: string) => boolean; exportSnapshot: () => string }
export function Reproduction({ code, generation, status, loadBoard, loadSnapshot, exportSnapshot }: ReproductionProps) {
  const [draft, setDraft] = useState(code), [snapshot, setSnapshot] = useState('');
  useEffect(() => { setDraft(code); }, [code, generation]);
  return <details className="reproduction"><summary>Reproduce a game</summary><div className="repro-content"><p>Share a board code to repeat a deal, or save your progress as a snapshot.</p><label htmlFor="code">Board code</label><div className="input-row"><input id="code" maxLength={32} value={draft} onChange={e => setDraft(e.target.value)}/><button onClick={() => loadBoard(draft)}>Load board</button></div><label htmlFor="snapshot">Snapshot JSON</label><textarea id="snapshot" maxLength={65536} rows={5} value={snapshot} onChange={e => setSnapshot(e.target.value)}/><div className="button-row"><button onClick={() => setSnapshot(exportSnapshot())}>Export snapshot</button><button onClick={() => loadSnapshot(snapshot)}>Load snapshot</button></div><p className="load-status">{status}</p></div></details>;
}
